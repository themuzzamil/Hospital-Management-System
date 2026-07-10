import { redirect } from "next/navigation";
import { getCurrentUser, homeForRole } from "@/lib/session";
import { Icon } from "@/components/icons";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeForRole(user.role));

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <span className="grid place-items-center h-10 w-10 rounded-lg bg-primary text-primary-fg">
            <Icon name="cross" size={20} fill="currentColor" stroke="none" />
          </span>
          <div>
            <div className="text-lg font-semibold tracking-tight">MediStruct</div>
            <p className="text-muted text-xs">Hospital Management System</p>
          </div>
        </div>

        <div className="card p-6">
          <h1 className="text-base font-semibold mb-4">Sign in to your account</h1>
          <LoginForm />
        </div>

        <div className="card p-4 mt-4 text-xs text-muted">
          <p className="font-medium text-foreground mb-2">Demo accounts</p>
          <ul className="space-y-1">
            <li>Admin — admin@medistruct.com / admin123</li>
            <li>Doctor — sara@medistruct.com / doctor123</li>
            <li>Reception — reception@medistruct.com / reception123</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
