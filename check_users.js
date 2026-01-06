const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const email = "chandru_admin@gmail.com";
    const user = await prisma.user.findUnique({
        where: { email }
    });
    if (user) {
        console.log("FOUND_USER: " + user.email + " ROLE: " + user.role);
    } else {
        console.log("USER_NOT_FOUND: " + email);
        // Let's list all admin emails
        const admins = await prisma.user.findMany({
            where: { role: "admin" },
            select: { email: true }
        });
        console.log("ADMINS: " + JSON.stringify(admins));
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
