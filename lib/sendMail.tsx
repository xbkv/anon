import nodemailer from "nodemailer";

export default async function sendMail(to: string, subject: string, text: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"匿名掲示板" <no-reply@anonaddy.me>`,
      to, 
      subject,
      text, 
    });

    console.log("匿名メールが送信されました");
  } catch (error) {
    console.error("メール送信エラー:", error);
    throw new Error("メール送信に失敗しました");
  }
}
