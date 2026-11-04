import * as z from 'zod/mini';

import * as schemas from '../generated/zod.gen';
import * as fixtures from './fixtures';

// The mocks are typed with the contract at compile time; here every one is also parsed with the Zod schema
// generated from the same contract, so they can never drift from what the real API sends.
describe('mock fixtures follow the API contract', () => {
  const cases: [string, unknown, z.ZodMiniType][] = [
    ['MOCK_ADMIN', fixtures.MOCK_ADMIN, schemas.zUserOut],
    ['MOCK_TEACHERS', fixtures.MOCK_TEACHERS, z.array(schemas.zTeacherOut)],
    ['MOCK_CLASSROOMS', fixtures.MOCK_CLASSROOMS, z.array(schemas.zClassroomOut)],
    ['MOCK_GROUPS', fixtures.MOCK_GROUPS, z.array(schemas.zGroupOut)],
    ['MOCK_SUBJECTS', fixtures.MOCK_SUBJECTS, z.array(schemas.zSubjectOut)],
    ['MOCK_SCHEDULE', fixtures.MOCK_SCHEDULE, z.array(schemas.zScheduleEntryOut)],
    ['MOCK_AVAILABILITY', fixtures.MOCK_AVAILABILITY, z.array(schemas.zAvailabilityOut)],
    ['MOCK_NOTIFICATIONS', fixtures.MOCK_NOTIFICATIONS, z.array(schemas.zNotificationOut)],
    ['MOCK_STATISTICS', fixtures.MOCK_STATISTICS, schemas.zStatisticsOut],
    ['MOCK_CONFLICTS', fixtures.MOCK_CONFLICTS, schemas.zConflictReport],
    ['MOCK_READINESS', fixtures.MOCK_READINESS, schemas.zReadinessOut],
    ['MOCK_REGISTER_GROUPS', fixtures.MOCK_REGISTER_GROUPS, z.array(schemas.zRegisterGroup)],
    ['MOCK_AI_STATUS', fixtures.MOCK_AI_STATUS, schemas.zAiStatus],
    ['mockToken()', fixtures.mockToken(), schemas.zTokenOut],
  ];

  it.each(cases)('%s', (_name, value, schema) => {
    expect(schema.safeParse(value).success).toBe(true);
  });
});
