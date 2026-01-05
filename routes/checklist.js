const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const nodemailer = require("nodemailer");
const { verifyToken } = require("../middleware/auth");
const prisma = new PrismaClient();

// Get all checklists for the logged in user
router.get("/", verifyToken, async (req, res) => {
    try {
        const checklists = await prisma.checklist.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(checklists);
    } catch (error) {
        res.status(500).json({ message: "Error fetching checklists" });
    }
});

// Create a new checklist
router.post("/", verifyToken, async (req, res) => {
    try {
        const { title, items, date } = req.body;

        // Use the USER ID from the JWT token (req.user.id)
        const checklist = await prisma.checklist.create({
            data: {
                userId: req.user.id,
                items: items, // Assuming items is JSON or similar structure in your schema
                title: title || "New Checklist" // Assuming you might want a title
            }
        });

        // Fetch user email for notification
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });

        // EMAIL CONFIGURATION
        // Note: In production, use environment variables for credentials
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true, // Use SSL
            auth: {
                user: process.env.EMAIL_USER || "druc70609@gmail.com",
                pass: process.env.EMAIL_PASS || "icus aeim bqaq bbom"
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Verify connection configuration
        transporter.verify(function (error, success) {
            if (error) {
                console.log("TRANSPORTER CONNECTION ERROR:", error);
            } else {
                console.log("Server is ready to take our messages");
            }
        });

        // Send Admin Notification
        const adminEmail = process.env.ADMIN_EMAIL || "ck6582293@gmail.com";

        try {
            console.log("Attempting to send admin email to:", adminEmail);

            // Format items for email
            const itemsHtml = items.map(item => `
                <div style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                    <p><strong>${item.title}:</strong> ${item.response}</p>
                    ${item.comment ? `<p style="color: #666; font-style: italic;">Remark: ${item.comment}</p>` : ""}
                </div>
            `).join("");

            await transporter.sendMail({
                from: '"Checklist Pro" <druc70609@gmail.com>',
                to: adminEmail,
                subject: `🚀 Checklist Submitted: ${checklist.title} by ${user.name}`,
                html: `
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 40px; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <div style="display: inline-block; padding: 12px; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); border-radius: 12px; margin-bottom: 16px;">
                                <span style="font-size: 32px;">📋</span>
                            </div>
                            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">New Submission Received</h2>
                        </div>

                        <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #f1f5f9;">
                            <p style="margin: 0 0 12px 0; color: #64748b; font-size: 14px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Submission Details</p>
                            <div style="margin-bottom: 8px;"><strong style="color: #475569;">Checklist:</strong> <span style="color: #1e293b;">${checklist.title}</span></div>
                            <div style="margin-bottom: 8px;"><strong style="color: #475569;">Employee:</strong> <span style="color: #6366f1; font-weight: 600;">${user.name}</span> <span style="color: #94a3b8; font-size: 13px;">(${user.email})</span></div>
                            <div><strong style="color: #475569;">Date:</strong> <span style="color: #1e293b;">${date}</span></div>
                        </div>

                        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 32px 0;">
                        
                        <h3 style="color: #1e293b; font-size: 18px; font-weight: 700; margin-bottom: 20px;">Detailed Responses:</h3>
                        ${itemsHtml}
                        
                        <div style="margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px;">
                            © 2026 Checklist Pro Management System. All rights reserved.
                        </div>
                    </div>
                `
            });
            console.log("Admin email sent successfully!");
        } catch (emailError) {
            console.error("ADMIN EMAIL FAILED:", emailError.message);
        }

        // Send User Confirmation
        try {
            if (user.email) {
                console.log("Attempting to send user confirmation to:", user.email);
                await transporter.sendMail({
                    from: '"Checklist Pro" <druc70609@gmail.com>',
                    to: user.email,
                    subject: "✅ Submission Confirmed: " + checklist.title,
                    html: `
                        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 40px; border-radius: 16px; background-color: #ffffff;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <div style="display: inline-block; padding: 12px; background-color: #ecfdf5; border-radius: 50%; margin-bottom: 16px;">
                                    <span style="font-size: 32px;">✅</span>
                                </div>
                                <h2 style="color: #064e3b; margin: 0; font-size: 24px;">Submission Successful</h2>
                            </div>
                            
                            <p style="color: #374151; font-size: 16px; line-height: 1.5;">Hi <strong>${user.name}</strong>,</p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.5;">Your checklist <strong>"${checklist.title}"</strong> has been successfully submitted and recorded.</p>
                            
                            <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-top: 24px; border: 1px solid #f3f4f6;">
                                <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase;">Submission Summary</p>
                                <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px;"><strong>Date:</strong> ${date}</p>
                                <div style="margin-top: 20px;">
                                    ${itemsHtml}
                                </div>
                            </div>

                            <p style="color: #6b7280; font-size: 14px; margin-top: 40px; text-align: center; border-top: 1px solid #f3f4f6; pt-20">
                                This is an automated message from Checklist Pro.
                            </p>
                        </div>
                    `
                });
                console.log("User confirmation email sent successfully!");
            }
        } catch (emailError) {
            console.error("USER EMAIL FAILED:", emailError.message);
        }

        res.json({ message: "Checklist saved successfully", checklist });
    } catch (error) {
        console.error("Checklist creation error:", error);
        res.status(500).json({ message: "Error saving checklist" });
    }
});

module.exports = router;
