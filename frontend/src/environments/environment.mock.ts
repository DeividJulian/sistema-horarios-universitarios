// npm run start:mock: the frontend works without the backend; the API is answered by typed fixtures
// (core/api/mocks) that follow the contract. The sign-in code is 123456.
export const environment = {
  production: false,
  apiUrl: 'http://api.mock.local',
  mockApi: true,
};
