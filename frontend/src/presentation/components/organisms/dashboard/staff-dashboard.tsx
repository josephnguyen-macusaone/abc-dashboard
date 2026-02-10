import { Card, CardHeader, CardTitle, CardDescription } from '@/presentation/components/atoms/primitives/card';
import { useAuthStore } from '@/infrastructure/stores/auth';

export function StaffDashboard() {
    const { user } = useAuthStore();

    return (
        <div>
            <Card className="text-center">
                <CardHeader>
                    <CardTitle className="text-2xl">Welcome to Your Dashboard</CardTitle>
                    <CardDescription>
                        Hello {user?.firstName || user?.displayName || 'there'}!
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}