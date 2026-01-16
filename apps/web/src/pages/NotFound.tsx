import { Link } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="max-w-md w-full text-center">
        <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Страница не найдена</h2>
        <p className="text-gray-600 mb-6">
          Запрашиваемая страница не существует или была перемещена.
        </p>
        <Link to="/dashboard">
          <Button variant="primary">
            <Home className="h-4 w-4 mr-2" />
            На главную
          </Button>
        </Link>
      </Card>
    </div>
  );
}
