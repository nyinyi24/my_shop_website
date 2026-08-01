import { AppHeader } from "@/components/AppHeader";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
export default async function ResetPasswordPage({searchParams}:{searchParams:Promise<{token?:string;email?:string}>}){const params=await searchParams;return <main className="auth-shell"><AppHeader/><section className="reset-layout"><ResetPasswordForm token={params.token||""} email={params.email||""}/></section></main>;}
