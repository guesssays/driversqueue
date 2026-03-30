import { supabaseAdmin, type RequestAuth } from './supabase';
import { HttpError } from './utils';

export interface OfficeRecord {
  id: string;
  code: string;
  slug: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfficeScopedConfig {
  logo_url: string;
  qr_enabled: boolean;
  retention_days: number;
  timezone: string;
  screens_lang: 'ru' | 'uzLat' | 'uzCyr';
}

type ConfigValue = string | number | boolean;

const DEFAULT_GLOBAL_CONFIG = {
  retention_days: 90,
  timezone: 'Asia/Tashkent',
} as const;

const DEFAULT_OFFICE_CONFIG = {
  logo_url: 'https://via.placeholder.com/200x80?text=LOGO',
  qr_enabled: true,
  screens_lang: 'uzLat',
} as const;

const OFFICE_CONFIG_KEYS = new Set<keyof typeof DEFAULT_OFFICE_CONFIG>([
  'logo_url',
  'qr_enabled',
  'screens_lang',
]);

const GLOBAL_CONFIG_KEYS = new Set<keyof typeof DEFAULT_GLOBAL_CONFIG>([
  'retention_days',
  'timezone',
]);

function normalizeString(value: ConfigValue | null | undefined, fallback: string): string {
  return typeof value === 'string' && value.length > 0
    ? value
    : fallback;
}

function normalizeBoolean(value: ConfigValue | null | undefined, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeNumber(value: ConfigValue | null | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeLanguage(value: ConfigValue | null | undefined): OfficeScopedConfig['screens_lang'] {
  return value === 'ru' || value === 'uzLat' || value === 'uzCyr'
    ? value
    : DEFAULT_OFFICE_CONFIG.screens_lang;
}

export async function listAccessibleOffices(auth: RequestAuth): Promise<OfficeRecord[]> {
  if (auth.profile.role === 'admin') {
    const { data, error } = await supabaseAdmin
      .from('offices')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new HttpError('Failed to load offices', 500);
    }

    return data || [];
  }

  const { data: assignments, error: assignmentsError } = await supabaseAdmin
    .from('profile_offices')
    .select('office_id')
    .eq('profile_id', auth.user.id);

  if (assignmentsError) {
    throw new HttpError('Failed to load office assignments', 500);
  }

  const officeIds = (assignments || []).map((item) => item.office_id);
  if (officeIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('offices')
    .select('*')
    .in('id', officeIds)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new HttpError('Failed to load offices', 500);
  }

  return data || [];
}

export async function getOfficeById(officeId: string): Promise<OfficeRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('offices')
    .select('*')
    .eq('id', officeId)
    .maybeSingle();

  if (error) {
    throw new HttpError('Failed to load office', 500);
  }

  return (data as OfficeRecord | null) || null;
}

export async function getOfficeBySlug(officeSlug: string): Promise<OfficeRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('offices')
    .select('*')
    .eq('slug', officeSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new HttpError('Failed to load office', 500);
  }

  return (data as OfficeRecord | null) || null;
}

export async function requireAccessibleOffice(auth: RequestAuth, officeId: string): Promise<OfficeRecord> {
  const office = await getOfficeById(officeId);
  if (!office || !office.is_active) {
    throw new HttpError('Office not found', 404);
  }

  if (auth.profile.role === 'admin') {
    return office;
  }

  const { data: assignment, error } = await supabaseAdmin
    .from('profile_offices')
    .select('office_id')
    .eq('profile_id', auth.user.id)
    .eq('office_id', officeId)
    .maybeSingle();

  if (error) {
    throw new HttpError('Failed to validate office access', 500);
  }

  if (!assignment) {
    throw new HttpError('Office access denied', 403);
  }

  return office;
}

export async function requirePublicOffice(params: {
  officeId?: string | null;
  officeSlug?: string | null;
}): Promise<OfficeRecord> {
  if (params.officeId) {
    const office = await getOfficeById(params.officeId);
    if (office && office.is_active) {
      return office;
    }
  }

  if (params.officeSlug) {
    const office = await getOfficeBySlug(params.officeSlug);
    if (office) {
      return office;
    }
  }

  throw new HttpError('Office not found', 404);
}

export async function ensureOfficesExist(officeIds: string[]): Promise<void> {
  if (officeIds.length === 0) {
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('offices')
    .select('id')
    .in('id', officeIds);

  if (error) {
    throw new HttpError('Failed to validate offices', 500);
  }

  if ((data || []).length !== officeIds.length) {
    throw new HttpError('One or more offices were not found', 404);
  }
}

export async function getOfficeScopedConfig(officeId: string): Promise<OfficeScopedConfig> {
  const [{ data: globalRows, error: globalError }, { data: officeRows, error: officeError }] =
    await Promise.all([
      supabaseAdmin.from('system_config').select('key, value'),
      supabaseAdmin.from('office_config').select('key, value').eq('office_id', officeId),
    ]);

  if (globalError || officeError) {
    throw new HttpError('Failed to load office configuration', 500);
  }

  const globalConfig = new Map<string, ConfigValue>(
    (globalRows || []).map((row) => [row.key, row.value as ConfigValue]),
  );
  const officeConfig = new Map<string, ConfigValue>(
    (officeRows || []).map((row) => [row.key, row.value as ConfigValue]),
  );

  return {
    logo_url: normalizeString(officeConfig.get('logo_url'), DEFAULT_OFFICE_CONFIG.logo_url),
    qr_enabled: normalizeBoolean(officeConfig.get('qr_enabled'), DEFAULT_OFFICE_CONFIG.qr_enabled),
    screens_lang: normalizeLanguage(officeConfig.get('screens_lang')),
    retention_days: normalizeNumber(
      globalConfig.get('retention_days'),
      DEFAULT_GLOBAL_CONFIG.retention_days,
    ),
    timezone:
      typeof globalConfig.get('timezone') === 'string'
        ? (globalConfig.get('timezone') as string)
        : DEFAULT_GLOBAL_CONFIG.timezone,
  };
}

export async function saveOfficeScopedConfig(params: {
  officeId: string;
  updatedBy: string;
  updates: Partial<OfficeScopedConfig>;
}): Promise<OfficeScopedConfig> {
  const officeUpdates = Object.entries(params.updates).filter(([key]) =>
    OFFICE_CONFIG_KEYS.has(key as keyof typeof DEFAULT_OFFICE_CONFIG),
  );
  const globalUpdates = Object.entries(params.updates).filter(([key]) =>
    GLOBAL_CONFIG_KEYS.has(key as keyof typeof DEFAULT_GLOBAL_CONFIG),
  );

  for (const [key, value] of officeUpdates) {
    const { error } = await supabaseAdmin.from('office_config').upsert({
      office_id: params.officeId,
      key,
      value,
      updated_by: params.updatedBy,
    });

    if (error) {
      throw new HttpError('Failed to save office configuration', 500);
    }
  }

  for (const [key, value] of globalUpdates) {
    const { error } = await supabaseAdmin.from('system_config').upsert({
      key,
      value,
      updated_by: params.updatedBy,
    });

    if (error) {
      throw new HttpError('Failed to save global configuration', 500);
    }
  }

  return getOfficeScopedConfig(params.officeId);
}
