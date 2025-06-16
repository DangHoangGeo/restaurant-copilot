import { AlertTriangle, RefreshCw, Home, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CustomerErrorProps {
  error: string;
  onRetry?: () => void;
  type?: 'network' | 'not-found' | 'session' | 'generic';
}

export function CustomerError({ error, onRetry, type = 'generic' }: CustomerErrorProps) {
  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: <Wifi className="h-12 w-12 text-red-500" />,
          title: 'Connection Error',
          description: 'Please check your internet connection and try again.',
          showRetry: true
        };
      case 'not-found':
        return {
          icon: <AlertTriangle className="h-12 w-12 text-orange-500" />,
          title: 'Restaurant Not Found',
          description: 'The restaurant you\'re looking for could not be found.',
          showRetry: false
        };
      case 'session':
        return {
          icon: <AlertTriangle className="h-12 w-12 text-amber-500" />,
          title: 'Session Expired',
          description: 'Your session has expired. Please scan the QR code again.',
          showRetry: true
        };
      default:
        return {
          icon: <AlertTriangle className="h-12 w-12 text-red-500" />,
          title: 'Something went wrong',
          description: 'An unexpected error occurred.',
          showRetry: true
        };
    }
  };

  const config = getErrorConfig();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            {config.icon}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {config.title}
          </h1>
          
          <p className="text-gray-600 mb-6">
            {config.description}
          </p>
          
          <Alert className="mb-6 text-left">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription className="mt-2 text-sm">
              {error}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {config.showRetry && onRetry && (
              <Button onClick={onRetry} className="w-full" size="lg">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'} 
              className="w-full"
              size="lg"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RestaurantNotFoundError() {
  return (
    <CustomerError
      error="This restaurant subdomain does not exist or is no longer active."
      type="not-found"
    />
  );
}

export function SessionExpiredError({ onRetry }: { onRetry?: () => void }) {
  return (
    <CustomerError
      error="Your ordering session has expired or is no longer valid."
      onRetry={onRetry}
      type="session"
    />
  );
}

export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <CustomerError
      error="Unable to connect to the server. Please check your internet connection."
      onRetry={onRetry}
      type="network"
    />
  );
}
