const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

async function main() {
    const email = "chandru_admin@gmail.com";
    const password = "admin123";
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            role: "admin"
        },
        create: {
            email,
            name: "Chandru Admin",
            password: hashedPassword,
            role: "admin"
        }
    });

    console.log("SUCCESS: User " + email + " is now an admin with password: " + password);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
