import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const teams = [
  { name: 'Engineering' },
  { name: 'Product' },
] as const;

const users = [
  {
    email: 'admin@kudos.local',
    password: 'Admin123!',
    displayName: 'Kudos Admin',
    role: UserRole.ADMIN,
    teamName: 'Engineering',
  },
  {
    email: 'alex.member@kudos.local',
    password: 'Member123!',
    displayName: 'Alex Morgan',
    role: UserRole.MEMBER,
    teamName: 'Engineering',
  },
  {
    email: 'sam.member@kudos.local',
    password: 'Member123!',
    displayName: 'Sam Rivera',
    role: UserRole.MEMBER,
    teamName: 'Product',
  },
  {
    email: 'jordan.member@kudos.local',
    password: 'Member123!',
    displayName: 'Jordan Lee',
    role: UserRole.MEMBER,
    teamName: 'Engineering',
  },
  {
    email: 'taylor.member@kudos.local',
    password: 'Member123!',
    displayName: 'Taylor Kim',
    role: UserRole.MEMBER,
    teamName: 'Product',
  },
] as const;

const kudosSeeds = [
  { id: 'seed-kudos-01', sender: 0, recipient: 1, message: 'Thanks for helping resolve the deployment issue!', date: '2025-01-04T12:00:00.000Z' },
  { id: 'seed-kudos-02', sender: 1, recipient: 2, message: 'Your thoughtful product feedback made this clearer.', date: '2025-01-07T12:00:00.000Z' },
  { id: 'seed-kudos-03', sender: 2, recipient: 3, message: 'I appreciate your help onboarding our new teammate.', date: '2025-01-10T12:00:00.000Z' },
  { id: 'seed-kudos-04', sender: 3, recipient: 4, message: 'Great work coordinating across the teams.', date: '2025-01-13T12:00:00.000Z' },
  { id: 'seed-kudos-05', sender: 4, recipient: 1, message: 'Thank you for sharing your testing expertise.', date: '2025-01-16T12:00:00.000Z' },
  { id: 'seed-kudos-06', sender: 1, recipient: 0, message: 'Thanks for making time to unblock us.', date: '2025-01-19T12:00:00.000Z' },
  { id: 'seed-kudos-07', sender: 0, recipient: 2, message: 'Your clear documentation helped everyone.', date: '2025-02-03T12:00:00.000Z' },
  { id: 'seed-kudos-08', sender: 2, recipient: 4, message: 'Excellent job bringing the project over the finish line.', date: '2025-02-06T12:00:00.000Z' },
  { id: 'seed-kudos-09', sender: 3, recipient: 1, message: 'Thanks for stepping in and helping with the review.', date: '2025-02-09T12:00:00.000Z' },
  { id: 'seed-kudos-10', sender: 4, recipient: 3, message: 'I value how carefully you considered the edge cases.', date: '2025-02-12T12:00:00.000Z' },
  { id: 'seed-kudos-11', sender: 1, recipient: 4, message: 'Thanks for your reliable partnership this month.', date: '2025-02-15T12:00:00.000Z' },
  { id: 'seed-kudos-12', sender: 2, recipient: 0, message: 'You made a challenging problem feel manageable.', date: '2025-02-18T12:00:00.000Z' },
] as const;

async function main(): Promise<void> {
  const teamsByName = new Map<string, { id: string }>();
  for (const team of teams) {
    const savedTeam = await prisma.team.upsert({
      where: { name: team.name },
      create: team,
      update: {},
      select: { id: true },
    });
    teamsByName.set(team.name, savedTeam);
  }

  const usersByEmail = new Map<string, { id: string }>();
  for (const user of users) {
    const team = teamsByName.get(user.teamName);
    if (!team) {
      throw new Error(`Missing seeded team ${user.teamName}`);
    }

    const passwordHash = await bcrypt.hash(user.password, 10);
    const savedUser = await prisma.user.upsert({
      where: { email: user.email },
      create: {
        email: user.email,
        passwordHash,
        displayName: user.displayName,
        role: user.role,
        teamId: team.id,
      },
      // Keep existing hashes on reruns so the same seeded accounts are reused.
      update: {
        displayName: user.displayName,
        role: user.role,
        teamId: team.id,
      },
      select: { id: true },
    });
    usersByEmail.set(user.email, savedUser);
  }

  const seededUsers = users.map((user) => {
    const savedUser = usersByEmail.get(user.email);
    if (!savedUser) {
      throw new Error(`Missing seeded user ${user.email}`);
    }
    return savedUser;
  });

  for (const seed of kudosSeeds) {
    const sender = seededUsers[seed.sender];
    const recipient = seededUsers[seed.recipient];
    if (!sender || !recipient) {
      throw new Error(`Invalid user index in ${seed.id}`);
    }

    const createdAt = new Date(seed.date);
    await prisma.kudos.upsert({
      where: { id: seed.id },
      create: {
        id: seed.id,
        senderId: sender.id,
        message: seed.message,
        // The canonical company-value labels are not specified; this is seed-only placeholder data.
        companyValue: 'SEED',
        createdAt,
      },
      update: {
        senderId: sender.id,
        message: seed.message,
        companyValue: 'SEED',
        createdAt,
      },
    });

    await prisma.kudosRecipient.upsert({
      where: {
        kudosId_recipientId: { kudosId: seed.id, recipientId: recipient.id },
      },
      create: { kudosId: seed.id, recipientId: recipient.id },
      update: {},
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
