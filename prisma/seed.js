import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const specializations = [
  "Anxiety",
  "Depression",
  "PTSD",
  "Couples Therapy",
  "Family Therapy",
  "Addiction",
  "Trauma",
  "Eating Disorders",
  "OCD",
  "Bipolar Disorder",
];

const firstNames = {
  doctors: [
    "Ahmed",
    "Fatima",
    "Mohamed",
    "Aicha",
    "Omar",
    "Khadija",
    "Hassan",
    "Mariam",
    "Youssef",
    "Salma",
    "Ibrahim",
    "Layla",
    "Ali",
    "Nour",
    "Khalid",
  ],
  clients: [
    "Amine",
    "Sana",
    "Bilal",
    "Hiba",
    "Tarik",
    "Nada",
    "Karim",
    "Rania",
    "Mehdi",
    "Yasmine",
    "Said",
    "Leila",
    "Rachid",
    "Samira",
    "Nabil",
    "Souad",
    "Hamza",
    "Nadia",
    "Yassine",
    "Hind",
    "Reda",
    "Salma",
    "Anas",
    "Imane",
    "Zakaria",
    "Aicha",
    "Younes",
    "Meriem",
  ],
};

const lastNames = [
  "Alami",
  "Benali",
  "Ould",
  "Mohamed",
  "Hassan",
  "Ibrahim",
  "Ali",
  "Khalil",
  "Bouazza",
  "Tazi",
  "El Fassi",
  "Bennani",
  "Alaoui",
  "Berrada",
  "Chraibi",
];

const comments = [
  "Excellent therapist, very understanding and professional.",
  "Great session, helped me a lot with my anxiety.",
  "Very knowledgeable and patient. Highly recommend!",
  "The therapist was very empathetic and provided great insights.",
  "Good experience, but could be more punctual.",
  "Professional and caring. Made me feel comfortable.",
  "Very helpful session, looking forward to the next one.",
  "The therapist understood my concerns and provided practical advice.",
  "Excellent communication and professional approach.",
  "Good therapist, but the session felt a bit rushed.",
  "Very supportive and understanding. Great experience!",
  "Professional service, would recommend to others.",
  "The therapist was patient and listened carefully.",
  "Helpful session, but need more time to see results.",
  "Excellent therapist with great expertise in the field.",
];

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log("🧹 Cleaning existing data...");
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.message.deleteMany();
  await prisma.sessionNote.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.doctorStatistics.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("password123", 10);

  // Create Admin
  console.log("👤 Creating admin...");
  const admin = await prisma.user.create({
    data: {
      email: "admin@therapy.com",
      password,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      preferredLanguage: "FRENCH",
      isVerified: true,
    },
  });

  // Create Doctors
  console.log("👨‍⚕️ Creating doctors...");
  const doctors = [];
  const doctorProfiles = [];

  for (let i = 0; i < 15; i++) {
    const firstName = firstNames.doctors[i % firstNames.doctors.length];
    const lastName = lastNames[i % lastNames.length];
    const email = `doctor${i + 1}@therapy.com`;
    const phone = `+222 45 25 ${String(i + 1).padStart(2, "0")} ${String(
      i + 1
    ).padStart(2, "0")}`;

    // Create doctor user
    const doctor = await prisma.user.create({
      data: {
        email,
        phone,
        password,
        firstName,
        lastName,
        role: "DOCTOR",
        preferredLanguage: i % 2 === 0 ? "FRENCH" : "ARABIC",
        isVerified: true,
      },
    });

    // Create doctor profile
    const numSpecializations = Math.floor(Math.random() * 3) + 1;
    const selectedSpecializations = [];
    for (let j = 0; j < numSpecializations; j++) {
      const spec =
        specializations[Math.floor(Math.random() * specializations.length)];
      if (!selectedSpecializations.includes(spec)) {
        selectedSpecializations.push(spec);
      }
    }

    const languages = [];
    if (Math.random() > 0.3) languages.push("FRENCH");
    if (Math.random() > 0.3) languages.push("ARABIC");
    if (languages.length === 0) languages.push("FRENCH");

    const hourlyRate = Math.floor(Math.random() * 200) + 50; // 50-250 MRU
    const yearsOfExperience = Math.floor(Math.random() * 20) + 1; // 1-20 years

    // Generate available hours
    const availableHours = {};
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    days.forEach((day) => {
      if (Math.random() > 0.2) {
        // 80% chance of having hours on this day
        const slots = [];
        if (Math.random() > 0.3) slots.push("09:00-12:00");
        if (Math.random() > 0.3) slots.push("14:00-17:00");
        if (slots.length > 0) {
          availableHours[day] = slots;
        }
      }
    });

    const doctorProfile = await prisma.doctorProfile.create({
      data: {
        userId: doctor.id,
        bio: `Experienced therapist specializing in ${selectedSpecializations.join(
          ", "
        )}. With ${yearsOfExperience} years of experience, I help patients overcome various mental health challenges.`,
        specialization: selectedSpecializations,
        languages: languages,
        hourlyRate,
        yearsOfExperience,
        availableHours,
        isVerified: true,
        rating: 0,
        totalReviews: 0,
      },
    });

    doctors.push(doctor);
    doctorProfiles.push(doctorProfile);
  }

  // Create Clients
  console.log("👥 Creating clients...");
  const clients = [];
  const clientProfiles = [];

  for (let i = 0; i < 30; i++) {
    const firstName = firstNames.clients[i % firstNames.clients.length];
    const lastName = lastNames[i % lastNames.length];
    const email = `client${i + 1}@therapy.com`;
    const phone = `+222 45 26 ${String(i + 1).padStart(2, "0")} ${String(
      i + 1
    ).padStart(2, "0")}`;

    const client = await prisma.user.create({
      data: {
        email,
        phone,
        password,
        firstName,
        lastName,
        role: "CLIENT",
        preferredLanguage: i % 2 === 0 ? "FRENCH" : "ARABIC",
        isVerified: true,
      },
    });

    const clientProfile = await prisma.clientProfile.create({
      data: {
        userId: client.id,
        dateOfBirth: new Date(
          1980 + Math.floor(Math.random() * 30),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1
        ),
        city: ["Nouakchott", "Nouadhibou", "Rosso", "Kaédi"][
          Math.floor(Math.random() * 4)
        ],
        country: "Mauritania",
      },
    });

    clients.push(client);
    clientProfiles.push(clientProfile);
  }

  // Create Bookings
  console.log("📅 Creating bookings...");
  const bookings = [];
  const now = new Date();

  // Create bookings for each client with different doctors
  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const clientProfile = clientProfiles[i];

    // Each client will have 2-5 bookings
    const numBookings = Math.floor(Math.random() * 4) + 2;

    for (let j = 0; j < numBookings; j++) {
      const doctorIndex = Math.floor(Math.random() * doctors.length);
      const doctor = doctors[doctorIndex];
      const doctorProfile = doctorProfiles[doctorIndex];

      // Random date: some past, some future
      const daysOffset = Math.floor(Math.random() * 60) - 30; // -30 to +30 days
      const sessionDate = new Date(now);
      sessionDate.setDate(now.getDate() + daysOffset);
      sessionDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);

      const sessionTypes = ["video", "chat", "in-person"];
      const sessionType =
        sessionTypes[Math.floor(Math.random() * sessionTypes.length)];
      const sessionDuration = [60, 90, 120][Math.floor(Math.random() * 3)];

      // Determine status based on date
      let status;
      if (sessionDate < now) {
        // Past session - likely completed
        status = Math.random() > 0.2 ? "COMPLETED" : "CANCELLED";
      } else {
        // Future session
        const rand = Math.random();
        if (rand > 0.6) {
          status = "CONFIRMED";
        } else if (rand > 0.3) {
          status = "PENDING";
        } else {
          status = "CANCELLED";
        }
      }

      const booking = await prisma.booking.create({
        data: {
          clientId: clientProfile.id,
          doctorId: doctorProfile.id,
          sessionDate,
          sessionDuration,
          sessionType,
          status,
          notes:
            Math.random() > 0.5
              ? `Session notes for ${client.firstName} ${client.lastName}`
              : null,
        },
      });

      bookings.push(booking);

      // Create payment for CONFIRMED or COMPLETED bookings
      if (status === "CONFIRMED" || status === "COMPLETED") {
        const amount = (doctorProfile.hourlyRate * sessionDuration) / 60;
        const paymentStatus =
          status === "COMPLETED"
            ? Math.random() > 0.1
              ? "COMPLETED"
              : "PENDING"
            : Math.random() > 0.3
            ? "PENDING"
            : "COMPLETED";

        try {
          await prisma.payment.create({
            data: {
              bookingId: booking.id,
              clientId: clientProfile.id, // ClientProfile id, not User id
              amount,
              currency: "MRU",
              paymentMethod: "manual",
              status: paymentStatus,
            },
          });
        } catch (error) {
          console.log(`Payment creation skipped for booking ${booking.id}`);
        }
      }
    }
  }

  // Create Reviews for COMPLETED bookings
  console.log("⭐ Creating reviews...");
  const completedBookings = bookings.filter((b) => b.status === "COMPLETED");

  // Review about 60% of completed bookings
  const bookingsToReview = completedBookings.slice(
    0,
    Math.floor(completedBookings.length * 0.6)
  );

  for (const booking of bookingsToReview) {
    const clientProfile = clientProfiles.find(
      (cp) => cp.id === booking.clientId
    );
    const doctorProfile = doctorProfiles.find(
      (dp) => dp.id === booking.doctorId
    );

    if (!clientProfile || !doctorProfile) continue;

    const client = clients.find((c) => c.id === clientProfile.userId);
    if (!client) continue;

    const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars
    const hasComment = Math.random() > 0.3; // 70% have comments

    await prisma.review.create({
      data: {
        bookingId: booking.id,
        clientId: client.id,
        doctorId: doctorProfile.id,
        rating,
        comment: hasComment
          ? comments[Math.floor(Math.random() * comments.length)]
          : null,
      },
    });
  }

  // Update doctor ratings based on reviews
  console.log("📊 Updating doctor ratings...");
  for (const doctorProfile of doctorProfiles) {
    const reviews = await prisma.review.findMany({
      where: { doctorId: doctorProfile.id },
    });

    if (reviews.length > 0) {
      const avgRating =
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      await prisma.doctorProfile.update({
        where: { id: doctorProfile.id },
        data: {
          rating: avgRating,
          totalReviews: reviews.length,
        },
      });
    }
  }

  // Create some messages between clients and doctors
  console.log("💬 Creating sample messages...");
  const confirmedBookings = bookings.filter((b) => b.status === "CONFIRMED");
  const sampleBookings = confirmedBookings.slice(0, 10);

  for (const booking of sampleBookings) {
    const clientProfile = clientProfiles.find(
      (cp) => cp.id === booking.clientId
    );
    const doctorProfile = doctorProfiles.find(
      (dp) => dp.id === booking.doctorId
    );

    if (!clientProfile || !doctorProfile) continue;

    const client = clients.find((c) => c.id === clientProfile.userId);
    const doctor = doctors.find((d) => d.id === doctorProfile.userId);

    if (!client || !doctor) continue;

    // Create 2-4 messages between client and doctor
    const numMessages = Math.floor(Math.random() * 3) + 2;
    const messages = [
      "Hello, I'm looking forward to our session.",
      "Hi, I have a question about the session.",
      "Thank you for accepting my booking request.",
      "What should I prepare for our session?",
      "Hello, I wanted to confirm the session time.",
    ];

    for (let i = 0; i < numMessages; i++) {
      const isFromClient = i % 2 === 0;
      const sender = isFromClient ? client : doctor;
      const receiver = isFromClient ? doctor : client;

      await prisma.message.create({
        data: {
          senderId: sender.id,
          receiverId: receiver.id,
          bookingId: booking.id,
          content: messages[Math.floor(Math.random() * messages.length)],
          type: "TEXT",
          isRead: Math.random() > 0.3,
        },
      });
    }
  }

  // Create Doctor Statistics
  console.log("📈 Creating doctor statistics...");
  for (const doctorProfile of doctorProfiles) {
    const doctorBookings = bookings.filter(
      (b) => b.doctorId === doctorProfile.id
    );
    const completed = doctorBookings.filter(
      (b) => b.status === "COMPLETED"
    ).length;
    const upcoming = doctorBookings.filter(
      (b) => b.status === "CONFIRMED" && new Date(b.sessionDate) > now
    ).length;

    const completedPayments = await prisma.payment.findMany({
      where: {
        bookingId: {
          in: doctorBookings
            .filter((b) => b.status === "COMPLETED")
            .map((b) => b.id),
        },
        status: "COMPLETED",
      },
    });

    const totalEarnings = completedPayments.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    // Calculate monthly earnings (last 30 days)
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const monthlyPayments = completedPayments.filter(
      (p) => new Date(p.createdAt) >= thirtyDaysAgo
    );
    const monthlyEarnings = monthlyPayments.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    await prisma.doctorStatistics.create({
      data: {
        doctorId: doctorProfile.id,
        totalSessions: doctorBookings.length,
        completedSessions: completed,
        upcomingSessions: upcoming,
        totalEarnings,
        monthlyEarnings,
      },
    });
  }

  console.log("✅ Seeding completed successfully!");
  console.log(`   - Created ${doctors.length} doctors`);
  console.log(`   - Created ${clients.length} clients`);
  console.log(`   - Created ${bookings.length} bookings`);
  console.log(`   - Created ${bookingsToReview.length} reviews`);
  console.log(`   - Created ${sampleBookings.length * 2} messages`);
  console.log("\n📝 Test Accounts:");
  console.log("   Admin: admin@therapy.com / password123");
  console.log(
    "   Doctors: doctor1@therapy.com to doctor15@therapy.com / password123"
  );
  console.log(
    "   Clients: client1@therapy.com to client30@therapy.com / password123"
  );
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
