import { NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const { email, inviterName } = await req.json()
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    const { data, error } = await resend.emails.send({
      from: "Planora <invites@resend.dev>", 
      to: [email],
      subject: `${inviterName} invited you to join Planora!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1D9E75;">Planora</h1>
          <p>Hi there,</p>
          <p><strong>${inviterName}</strong> has invited you to join Planora, the ultimate collaborative trip planner.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signup" style="display: inline-block; background-color: #1D9E75; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 16px;">
            Join Planora
          </a>
          <p style="margin-top: 32px; font-size: 12px; color: #666;">
            If you don't know ${inviterName}, you can safely ignore this email.
          </p>
        </div>
      `
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
