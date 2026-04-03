import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding ShiftSync database...\n");

  // ── Clean existing data ──────────────────────────────────────────────────
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.swapRequest.deleteMany(),
    prisma.shiftAssignment.deleteMany(),
    prisma.shift.deleteMany(),
    prisma.availabilityException.deleteMany(),
    prisma.availability.deleteMany(),
    prisma.staffSkill.deleteMany(),
    prisma.staffLocationCertification.deleteMany(),
    prisma.managerLocation.deleteMany(),
    prisma.skill.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.location.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash("Password123!", 12);

  // ── Users ────────────────────────────────────────────────────────────────
  console.log("Creating users...");

  const admin = await prisma.user.create({
    data: {
      email: "corporate@coastaleats.com",
      passwordHash,
      firstName: "Alex",
      lastName: "Corporate",
      role: UserRole.ADMIN,
      phone: "555-000-0001",
    },
  });

  const manager1 = await prisma.user.create({
    data: {
      email: "james.wilson@coastaleats.com",
      passwordHash,
      firstName: "James",
      lastName: "Wilson",
      role: UserRole.MANAGER,
      phone: "555-100-0001",
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      email: "sarah.chen@coastaleats.com",
      passwordHash,
      firstName: "Sarah",
      lastName: "Chen",
      role: UserRole.MANAGER,
      phone: "555-100-0002",
    },
  });

  const staffData = [
    {
      email: "mike.johnson@coastaleats.com",
      firstName: "Mike",
      lastName: "Johnson",
      phone: "555-200-0001",
      desiredWeeklyHours: 35,
    },
    {
      email: "emily.davis@coastaleats.com",
      firstName: "Emily",
      lastName: "Davis",
      phone: "555-200-0002",
      desiredWeeklyHours: 40,
    },
    {
      email: "carlos.garcia@coastaleats.com",
      firstName: "Carlos",
      lastName: "Garcia",
      phone: "555-200-0003",
      desiredWeeklyHours: 38,
    },
    {
      email: "jessica.martinez@coastaleats.com",
      firstName: "Jessica",
      lastName: "Martinez",
      phone: "555-200-0004",
      desiredWeeklyHours: 30,
    },
    {
      email: "david.kim@coastaleats.com",
      firstName: "David",
      lastName: "Kim",
      phone: "555-200-0005",
      desiredWeeklyHours: 40,
    },
    {
      email: "ashley.brown@coastaleats.com",
      firstName: "Ashley",
      lastName: "Brown",
      phone: "555-200-0006",
      desiredWeeklyHours: 32,
    },
    {
      email: "ryan.taylor@coastaleats.com",
      firstName: "Ryan",
      lastName: "Taylor",
      phone: "555-200-0007",
      desiredWeeklyHours: 40,
    },
    {
      email: "sophia.anderson@coastaleats.com",
      firstName: "Sophia",
      lastName: "Anderson",
      phone: "555-200-0008",
      desiredWeeklyHours: 25,
    },
    {
      email: "marcus.lee@coastaleats.com",
      firstName: "Marcus",
      lastName: "Lee",
      phone: "555-200-0009",
      desiredWeeklyHours: 40,
    },
    {
      email: "olivia.white@coastaleats.com",
      firstName: "Olivia",
      lastName: "White",
      phone: "555-200-0010",
      desiredWeeklyHours: 35,
    },
    {
      email: "noah.thomas@coastaleats.com",
      firstName: "Noah",
      lastName: "Thomas",
      phone: "555-200-0011",
      desiredWeeklyHours: 38,
    },
    {
      email: "emma.jackson@coastaleats.com",
      firstName: "Emma",
      lastName: "Jackson",
      phone: "555-200-0012",
      desiredWeeklyHours: 20,
    },
  ];

  const staff: Record<string, any> = {};
  for (const s of staffData) {
    staff[s.firstName.toLowerCase()] = await prisma.user.create({
      data: {
        ...s,
        passwordHash,
        role: UserRole.STAFF,
      },
    });
  }

  console.log(`  ✓ Created 1 admin, 2 managers, ${staffData.length} staff`);

  // ── Locations ────────────────────────────────────────────────────────────
  console.log("Creating locations...");

  const downtown = await prisma.location.create({
    data: {
      name: "Coastal Eats Downtown",
      address: "123 Main St, New York, NY 10001",
      timezone: "America/New_York",
    },
  });

  const midtown = await prisma.location.create({
    data: {
      name: "Coastal Eats Midtown",
      address: "456 5th Ave, New York, NY 10018",
      timezone: "America/New_York",
    },
  });

  const westside = await prisma.location.create({
    data: {
      name: "Coastal Eats Westside",
      address: "789 Sunset Blvd, Los Angeles, CA 90028",
      timezone: "America/Los_Angeles",
    },
  });

  const marina = await prisma.location.create({
    data: {
      name: "Coastal Eats Marina",
      address: "321 Ocean Ave, Los Angeles, CA 90292",
      timezone: "America/Los_Angeles",
    },
  });

  console.log("  ✓ Created 4 locations (2 NYC, 2 LA)");

  // ── Manager → Location assignments ───────────────────────────────────────
  console.log("Assigning managers to locations...");

  await prisma.managerLocation.createMany({
    data: [
      { userId: manager1.id, locationId: downtown.id },
      { userId: manager1.id, locationId: midtown.id },
      { userId: manager2.id, locationId: westside.id },
      { userId: manager2.id, locationId: marina.id },
    ],
  });

  console.log(
    "  ✓ James Wilson → Downtown, Midtown | Sarah Chen → Westside, Marina",
  );

  // ── Skills ───────────────────────────────────────────────────────────────
  console.log("Creating skills...");

  const skillNames = [
    "bartender",
    "server",
    "line_cook",
    "host",
    "prep_cook",
    "dishwasher",
  ];
  const skills: Record<string, any> = {};
  for (const name of skillNames) {
    skills[name] = await prisma.skill.create({ data: { name } });
  }

  console.log(`  ✓ Created ${skillNames.length} skills`);

  // ── Staff Skills ─────────────────────────────────────────────────────────
  console.log("Assigning staff skills...");

  const staffSkillMap: Record<string, string[]> = {
    mike: ["bartender", "server"],
    emily: ["server", "host"],
    carlos: ["line_cook", "prep_cook"],
    jessica: ["bartender"],
    david: ["server", "host"],
    ashley: ["line_cook"],
    ryan: ["server", "bartender"],
    sophia: ["host", "server"],
    marcus: ["prep_cook", "dishwasher"],
    olivia: ["server", "bartender"],
    noah: ["line_cook", "dishwasher"],
    emma: ["host"],
  };

  for (const [staffName, skillList] of Object.entries(staffSkillMap)) {
    for (const skillName of skillList) {
      await prisma.staffSkill.create({
        data: { userId: staff[staffName].id, skillId: skills[skillName].id },
      });
    }
  }

  console.log("  ✓ Assigned skills to all staff");

  // ── Staff Location Certifications ────────────────────────────────────────
  console.log("Certifying staff at locations...");

  const certMap: Record<string, any[]> = {
    mike: [downtown, midtown],
    emily: [downtown],
    carlos: [midtown, westside], // Cross-timezone: NYC + LA
    jessica: [westside, marina],
    david: [marina],
    ashley: [downtown, marina], // Cross-timezone: NYC + LA
    ryan: [midtown],
    sophia: [westside],
    marcus: [downtown, midtown],
    olivia: [marina, westside],
    noah: [midtown],
    emma: [downtown, westside], // Cross-timezone: NYC + LA
  };

  for (const [staffName, locations] of Object.entries(certMap)) {
    for (const loc of locations) {
      await prisma.staffLocationCertification.create({
        data: { userId: staff[staffName].id, locationId: loc.id },
      });
    }
  }

  console.log("  ✓ Certified staff at locations (including cross-timezone)");

  // ── Availability ─────────────────────────────────────────────────────────
  console.log("Setting staff availability...");

  // Helper: create weekly availability for a user
  async function setWeeklyAvailability(
    userId: string,
    days: number[],
    startTime: string,
    endTime: string,
  ) {
    for (const day of days) {
      await prisma.availability.create({
        data: { userId, dayOfWeek: day, startTime, endTime, isRecurring: true },
      });
    }
  }

  // Most staff available Mon-Fri 9am-10pm, some weekends
  await setWeeklyAvailability(
    staff.mike.id,
    [1, 2, 3, 4, 5, 6],
    "09:00",
    "22:00",
  );
  await setWeeklyAvailability(
    staff.emily.id,
    [1, 2, 3, 4, 5],
    "08:00",
    "18:00",
  );
  await setWeeklyAvailability(
    staff.carlos.id,
    [0, 1, 2, 3, 4, 5],
    "06:00",
    "20:00",
  );
  await setWeeklyAvailability(
    staff.jessica.id,
    [2, 3, 4, 5, 6],
    "10:00",
    "23:00",
  );
  await setWeeklyAvailability(
    staff.david.id,
    [1, 2, 3, 4, 5, 6, 0],
    "07:00",
    "21:00",
  );
  await setWeeklyAvailability(staff.ashley.id, [1, 2, 3, 4], "09:00", "17:00");
  await setWeeklyAvailability(
    staff.ryan.id,
    [1, 2, 3, 4, 5, 6],
    "11:00",
    "23:00",
  );
  await setWeeklyAvailability(
    staff.sophia.id,
    [3, 4, 5, 6, 0],
    "08:00",
    "16:00",
  );
  await setWeeklyAvailability(
    staff.marcus.id,
    [1, 2, 3, 4, 5],
    "05:00",
    "15:00",
  );
  await setWeeklyAvailability(
    staff.olivia.id,
    [1, 2, 3, 4, 5, 6],
    "12:00",
    "23:00",
  );
  await setWeeklyAvailability(
    staff.noah.id,
    [0, 1, 2, 3, 4, 5],
    "06:00",
    "18:00",
  );
  await setWeeklyAvailability(staff.emma.id, [4, 5, 6, 0], "10:00", "20:00");

  console.log("  ✓ Set weekly availability for all staff");

  // ── Shifts, Assignments, Swap Requests & Notifications ───────────────────
  console.log("Creating shifts, assignments, and notifications...");

  const seedNow = new Date();

  /** Returns a Date `n` hours offset from seedNow */
  const h = (n: number) => new Date(seedNow.getTime() + n * 3_600_000);

  /** Returns midnight (local) on `dayOffset` days from today — for the `date` field */
  function midnight(dayOffset: number): Date {
    const d = new Date(seedNow);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /** Returns a specific hour on `dayOffset` days from today */
  function at(dayOffset: number, hour: number): Date {
    const d = new Date(seedNow);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    return d;
  }

  // ── Currently active shifts (on duty right now) ──
  const activeShift1 = await prisma.shift.create({
    data: {
      locationId: downtown.id,
      date: midnight(0),
      startTime: h(-2),
      endTime: h(4),
      requiredSkillId: skills.bartender.id,
      headcount: 2,
      status: "PUBLISHED",
      createdById: admin.id,
    },
  });
  const activeShift2 = await prisma.shift.create({
    data: {
      locationId: midtown.id,
      date: midnight(0),
      startTime: h(-1),
      endTime: h(5),
      requiredSkillId: skills.server.id,
      headcount: 1,
      status: "PUBLISHED",
      createdById: admin.id,
    },
  });
  const activeShift3 = await prisma.shift.create({
    data: {
      locationId: westside.id,
      date: midnight(0),
      startTime: h(-3),
      endTime: h(3),
      requiredSkillId: skills.line_cook.id,
      headcount: 1,
      status: "PUBLISHED",
      createdById: admin.id,
    },
  });

  // ── Past-week shifts for Carlos (Mon–Wed this week → 30 h)
  // Combined with today's 6 h active shift = 36 h total → OVERTIME
  const carlosShifts = await Promise.all([
    prisma.shift.create({
      data: {
        locationId: midtown.id,
        date: midnight(-4),
        startTime: at(-4, 9),
        endTime: at(-4, 19),
        requiredSkillId: skills.line_cook.id,
        headcount: 1,
        status: "PUBLISHED",
        createdById: admin.id,
      },
    }),
    prisma.shift.create({
      data: {
        locationId: midtown.id,
        date: midnight(-3),
        startTime: at(-3, 9),
        endTime: at(-3, 19),
        requiredSkillId: skills.line_cook.id,
        headcount: 1,
        status: "PUBLISHED",
        createdById: admin.id,
      },
    }),
    prisma.shift.create({
      data: {
        locationId: westside.id,
        date: midnight(-2),
        startTime: at(-2, 9),
        endTime: at(-2, 19),
        requiredSkillId: skills.line_cook.id,
        headcount: 1,
        status: "PUBLISHED",
        createdById: admin.id,
      },
    }),
  ]);

  // ── Past-week shifts for Ryan (Mon–Thu this week → 36 h total → OVERTIME)
  const ryanShifts = await Promise.all([
    prisma.shift.create({
      data: {
        locationId: midtown.id,
        date: midnight(-4),
        startTime: at(-4, 10),
        endTime: at(-4, 19),
        requiredSkillId: skills.server.id,
        headcount: 1,
        status: "PUBLISHED",
        createdById: admin.id,
      },
    }),
    prisma.shift.create({
      data: {
        locationId: midtown.id,
        date: midnight(-3),
        startTime: at(-3, 10),
        endTime: at(-3, 19),
        requiredSkillId: skills.server.id,
        headcount: 1,
        status: "PUBLISHED",
        createdById: admin.id,
      },
    }),
    prisma.shift.create({
      data: {
        locationId: midtown.id,
        date: midnight(-2),
        startTime: at(-2, 10),
        endTime: at(-2, 19),
        requiredSkillId: skills.server.id,
        headcount: 1,
        status: "PUBLISHED",
        createdById: admin.id,
      },
    }),
    prisma.shift.create({
      data: {
        locationId: midtown.id,
        date: midnight(-1),
        startTime: at(-1, 10),
        endTime: at(-1, 19),
        requiredSkillId: skills.server.id,
        headcount: 1,
        status: "PUBLISHED",
        createdById: admin.id,
      },
    }),
  ]);

  // ── Upcoming shifts (next 24 h, not yet started) ──
  const upcoming1 = await prisma.shift.create({
    data: {
      locationId: downtown.id,
      date: midnight(0),
      startTime: h(2),
      endTime: h(10),
      requiredSkillId: skills.server.id,
      headcount: 2,
      status: "PUBLISHED",
      createdById: admin.id,
    },
  });
  await prisma.shift.create({
    data: {
      locationId: marina.id,
      date: midnight(0),
      startTime: h(4),
      endTime: h(12),
      requiredSkillId: skills.host.id,
      headcount: 1,
      status: "PUBLISHED",
      createdById: admin.id,
    },
  });
  const upcoming3 = await prisma.shift.create({
    data: {
      locationId: midtown.id,
      date: midnight(0),
      startTime: h(6),
      endTime: h(14),
      requiredSkillId: skills.bartender.id,
      headcount: 2,
      status: "PUBLISHED",
      createdById: admin.id,
    },
  });

  // ── Future unassigned shifts (> 24 h away) ──
  await prisma.shift.createMany({
    data: [
      {
        locationId: downtown.id,
        date: midnight(2),
        startTime: h(26),
        endTime: h(34),
        requiredSkillId: skills.line_cook.id,
        headcount: 2,
        status: "PUBLISHED",
        createdById: admin.id,
      },
      {
        locationId: westside.id,
        date: midnight(2),
        startTime: h(28),
        endTime: h(36),
        requiredSkillId: skills.server.id,
        headcount: 1,
        status: "PUBLISHED",
        createdById: admin.id,
      },
    ],
  });

  // ── Assignments ──────────────────────────────────────────────────────────
  // On-duty now
  const assignMike = await prisma.shiftAssignment.create({
    data: {
      shiftId: activeShift1.id,
      userId: staff.mike.id,
      assignedById: admin.id,
      status: "CONFIRMED",
    },
  });
  await prisma.shiftAssignment.create({
    data: {
      shiftId: activeShift2.id,
      userId: staff.emily.id,
      assignedById: admin.id,
      status: "CONFIRMED",
    },
  });
  await prisma.shiftAssignment.create({
    data: {
      shiftId: activeShift3.id,
      userId: staff.carlos.id,
      assignedById: admin.id,
      status: "CONFIRMED",
    },
  });

  // Carlos overtime – Mon/Tue (midtown), Wed (westside)
  await prisma.shiftAssignment.createMany({
    data: [
      {
        shiftId: carlosShifts[0].id,
        userId: staff.carlos.id,
        assignedById: manager1.id,
        status: "CONFIRMED",
      },
      {
        shiftId: carlosShifts[1].id,
        userId: staff.carlos.id,
        assignedById: manager1.id,
        status: "CONFIRMED",
      },
      {
        shiftId: carlosShifts[2].id,
        userId: staff.carlos.id,
        assignedById: manager2.id,
        status: "CONFIRMED",
      },
    ],
  });

  // Ryan overtime – Mon–Thu (midtown)
  await prisma.shiftAssignment.createMany({
    data: ryanShifts.map((s) => ({
      shiftId: s.id,
      userId: staff.ryan.id,
      assignedById: manager1.id,
      status: "CONFIRMED" as const,
    })),
  });

  // Mike gets 1 of 2 slots on upcoming3 → still shows as unassigned
  const assignMikeUpcoming = await prisma.shiftAssignment.create({
    data: {
      shiftId: upcoming3.id,
      userId: staff.mike.id,
      assignedById: admin.id,
      status: "ASSIGNED",
    },
  });

  // David gets slot on upcoming1 (1 of 2) → still unassigned
  await prisma.shiftAssignment.create({
    data: {
      shiftId: upcoming1.id,
      userId: staff.david.id,
      assignedById: admin.id,
      status: "ASSIGNED",
    },
  });

  console.log("  ✓ Created 12 shifts with assignments");

  // ── Swap Requests ────────────────────────────────────────────────────────
  // Mike wants to drop his on-duty shift (pending, visible to admin + James)
  await prisma.swapRequest.create({
    data: {
      type: "DROP",
      requestorUserId: staff.mike.id,
      requestorAssignmentId: assignMike.id,
      status: "PENDING",
      expiresAt: h(48),
    },
  });
  // Mike also wants to drop his upcoming shift
  await prisma.swapRequest.create({
    data: {
      type: "DROP",
      requestorUserId: staff.mike.id,
      requestorAssignmentId: assignMikeUpcoming.id,
      status: "PENDING",
      expiresAt: h(24),
    },
  });

  console.log("  ✓ Created 2 pending swap requests");

  // ── Notifications ────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      // Admin (5)
      {
        userId: admin.id,
        type: "OVERTIME_WARNING",
        title: "Overtime Alert",
        message: "Carlos Garcia has 36+ hours scheduled this week.",
        isRead: false,
      },
      {
        userId: admin.id,
        type: "SWAP_REQUESTED",
        title: "New Swap Request",
        message: "Mike Johnson has requested to drop their Downtown shift.",
        isRead: false,
      },
      {
        userId: admin.id,
        type: "SCHEDULE_PUBLISHED",
        title: "Schedule Published",
        message: "Downtown schedule for this week has been published.",
        isRead: true,
      },
      {
        userId: admin.id,
        type: "OVERTIME_WARNING",
        title: "Overtime Alert",
        message: "Ryan Taylor has 36+ hours scheduled this week.",
        isRead: false,
      },
      {
        userId: admin.id,
        type: "GENERAL",
        title: "Welcome to ShiftSync",
        message: "Your ShiftSync dashboard is live. Start scheduling!",
        isRead: true,
      },
      // Manager – James Wilson (3)
      {
        userId: manager1.id,
        type: "SWAP_REQUESTED",
        title: "New Swap Request",
        message: "Mike Johnson has requested to drop their Downtown shift.",
        isRead: false,
      },
      {
        userId: manager1.id,
        type: "OVERTIME_WARNING",
        title: "Overtime Alert",
        message: "Ryan Taylor has exceeded 35 hours this week.",
        isRead: false,
      },
      {
        userId: manager1.id,
        type: "SCHEDULE_PUBLISHED",
        title: "Schedule Published",
        message: "Midtown schedule is now live for the week.",
        isRead: true,
      },
      // Staff – Mike (3)
      {
        userId: staff.mike.id,
        type: "SHIFT_ASSIGNED",
        title: "Shift Assigned",
        message: "You've been assigned to the Downtown bartender shift today.",
        isRead: false,
      },
      {
        userId: staff.mike.id,
        type: "SCHEDULE_PUBLISHED",
        title: "Schedule Published",
        message: "This week's Downtown schedule has been published.",
        isRead: true,
      },
      {
        userId: staff.mike.id,
        type: "SWAP_CANCELLED",
        title: "Swap Cancelled",
        message: "A previous swap request was cancelled.",
        isRead: false,
      },
    ],
  });

  console.log("  ✓ Created notifications for admin, managers, and staff");

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n✅ Seed complete!\n");
  console.log("Login credentials (all accounts use the same password):");
  console.log("  Password: Password123!\n");
  console.log("  Admin:   corporate@coastaleats.com");
  console.log(
    "  Manager: james.wilson@coastaleats.com (Downtown, Midtown NYC)",
  );
  console.log("  Manager: sarah.chen@coastaleats.com (Westside, Marina LA)");
  console.log("  Staff:   mike.johnson@coastaleats.com");
  console.log("  Staff:   emily.davis@coastaleats.com");
  console.log("  Staff:   carlos.garcia@coastaleats.com (cross-timezone)");
  console.log("  ... and 9 more staff members\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
