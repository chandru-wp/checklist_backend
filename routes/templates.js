const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { verifyToken, isAdmin } = require("../middleware/auth");
const prisma = new PrismaClient();

// Get all templates
router.get("/", verifyToken, async (req, res) => {
    try {
        const templates = await prisma.template.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: "Error fetching templates" });
    }
});

// Create a new template (admin only)
router.post("/", verifyToken, isAdmin, async (req, res) => {
    try {
        const { title, items } = req.body;
        const template = await prisma.template.create({
            data: { title, items }
        });
        res.status(201).json(template);
    } catch (error) {
        res.status(500).json({ message: "Error creating template" });
    }
});

// Update a template (admin only)
router.put("/:id", verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, items } = req.body;
        const template = await prisma.template.update({
            where: { id },
            data: { title, items }
        });
        res.json(template);
    } catch (error) {
        res.status(500).json({ message: "Error updating template" });
    }
});

// Delete a template (admin only)
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.template.delete({ where: { id } });
        res.json({ message: "Template deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting template" });
    }
});

// Assign template to user as a checklist (admin only)
router.post("/assign", verifyToken, isAdmin, async (req, res) => {
    try {
        const { userId, templateId } = req.body;

        const template = await prisma.template.findUnique({
            where: { id: templateId }
        });

        if (!template) {
            return res.status(404).json({ message: "Template not found" });
        }

        const checklist = await prisma.checklist.create({
            data: {
                title: template.title,
                items: template.items,
                userId: userId
            }
        });

        res.status(201).json(checklist);
    } catch (error) {
        console.error("Assign template error:", error);
        res.status(500).json({ message: "Error assigning template" });
    }
});

module.exports = router;
