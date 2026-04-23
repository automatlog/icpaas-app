const { prisma } = require('./client');

async function main() {
  await prisma.channelConfig.upsert({
    where: { phoneNumberId: '810597698802247' },
    update: {
      wabaNumber: '15558381431',
      wabaBusinessId: '1089993859592663',
      isDefault: true,
      label: 'Primary WhatsApp Channel',
    },
    create: {
      phoneNumberId: '810597698802247',
      wabaNumber: '15558381431',
      wabaBusinessId: '1089993859592663',
      isDefault: true,
      label: 'Primary WhatsApp Channel',
    },
  });

  await prisma.contact.upsert({
    where: { phone: '9428587817' },
    update: {
      name: 'Acme Corp',
      company: 'Acme Corp',
      email: 'ops@acme.example',
      leadStatus: 'hot',
      channelOptIns: 'whatsapp,sms,rcs',
    },
    create: {
      name: 'Acme Corp',
      phone: '9428587817',
      company: 'Acme Corp',
      email: 'ops@acme.example',
      leadStatus: 'hot',
      channelOptIns: 'whatsapp,sms,rcs',
    },
  });

  await prisma.contact.upsert({
    where: { phone: '8733806114' },
    update: {
      name: 'Zenith Retail',
      company: 'Zenith Retail',
      email: 'sales@zenith.example',
      leadStatus: 'warm',
      channelOptIns: 'sms',
    },
    create: {
      name: 'Zenith Retail',
      phone: '8733806114',
      company: 'Zenith Retail',
      email: 'sales@zenith.example',
      leadStatus: 'warm',
      channelOptIns: 'sms',
    },
  });

  await prisma.templateCache.upsert({
    where: { externalId: '600179689820048' },
    update: {
      name: 'welcomestoredefault',
      channel: 'whatsapp',
      status: 'APPROVED',
      category: 'MARKETING',
      language: 'en',
      body: 'Welcome',
    },
    create: {
      externalId: '600179689820048',
      name: 'welcomestoredefault',
      channel: 'whatsapp',
      status: 'APPROVED',
      category: 'MARKETING',
      language: 'en',
      body: 'Welcome',
    },
  });

  await prisma.templateCache.upsert({
    where: { externalId: 'testing_8' },
    update: {
      name: 'testing_8',
      channel: 'rcs',
      status: 'Approve',
      category: 'RCS',
      language: 'en',
      body: 'RCS template placeholder body',
    },
    create: {
      externalId: 'testing_8',
      name: 'testing_8',
      channel: 'rcs',
      status: 'Approve',
      category: 'RCS',
      language: 'en',
      body: 'RCS template placeholder body',
    },
  });

  await prisma.templateCache.upsert({
    where: { externalId: '1107161500710269782' },
    update: {
      name: 'WelcomeTemplate',
      channel: 'sms',
      status: 'APPROVED',
      category: 'Normal',
      language: 'en',
      body: 'Hello, this is a sample SMS template.',
    },
    create: {
      externalId: '1107161500710269782',
      name: 'WelcomeTemplate',
      channel: 'sms',
      status: 'APPROVED',
      category: 'Normal',
      language: 'en',
      body: 'Hello, this is a sample SMS template.',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
