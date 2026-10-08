import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/client/components/ui/Card';
import { Button } from '@/client/components/ui/Button';
import Page from '@/client/components/Page';

export default function NotFoundPage() {
  return (
    <Page seo={{ title: 'Page not found', noindex: true }}>
      <div className="flex items-center justify-center min-h-full">
        <Card className="w-full max-w-sm mx-auto animate-fade-in-up">
          <CardHeader className="text-center">
            <CardTitle className="text-6xl font-display font-bold text-signal">404</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-8">
            <p className="text-muted-foreground text-center font-mono text-sm">
              signal lost — page not found
            </p>
            <Link to="/" className="w-full">
              <Button className="w-full">
                Go home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
