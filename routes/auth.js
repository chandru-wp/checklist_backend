const router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "SECRET";

// Register new user
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ message: "User already exists with this email" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user (default role is 'user' unless admin creates them)
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || "user"
            }
        });

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

        res.status(201).json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Registration failed" });
    }
});

// Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Login failed" });
    }
});

const { verifyToken, isAdmin } = require("../middleware/auth");

// Get current user
router.get("/me", verifyToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching user" });
    }
});

// ADMIN ROUTES

// Get all users (admin only)
router.get("/users", verifyToken, isAdmin, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }
        });

        res.json(users);
    } catch (error) {
        console.error("Get users error:", error);
        res.status(500).json({ message: "Error fetching users" });
    }
});

// Get checklists for a specific user (admin only)
router.get("/users/:id/checklists", verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const checklists = await prisma.checklist.findMany({
            where: { userId: id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(checklists);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user checklists" });
    }
});

// Update a checklist (admin only)
router.put("/checklists/:id", verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, items } = req.body;
        const checklist = await prisma.checklist.update({
            where: { id },
            data: { title, items }
        });
        res.json(checklist);
    } catch (error) {
        res.status(500).json({ message: "Error updating checklist" });
    }
});

// Update user role (admin only)
router.put("/users/:id/role", verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!["user", "admin"].includes(role)) {
            return res.status(400).json({ message: "Invalid role. Must be 'user' or 'admin'" });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { role },
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }
        });

        res.json(updatedUser);
    } catch (error) {
        console.error("Update role error:", error);
        res.status(500).json({ message: "Error updating user role" });
    }
});

// Delete user (admin only)
router.delete("/users/:id", verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent admin from deleting themselves
        if (req.user.id === id) {
            return res.status(400).json({ message: "Cannot delete your own account" });
        }

        await prisma.user.delete({
            where: { id }
        });

        res.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({ message: "Error deleting user" });
    }
});

// Update user password (admin only)
router.put("/users/:id/password", verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id },
            data: { password: hashedPassword }
        });

        res.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Update password error:", error);
        res.status(500).json({ message: "Error updating password" });
    }
});

// Update user details (admin only)
router.put("/users/:id", verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { name, email },
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }
        });

        res.json(updatedUser);
    } catch (error) {
        console.error("Update user error:", error);
        res.status(500).json({ message: "Error updating user details" });
    }
});

module.exports = router;
