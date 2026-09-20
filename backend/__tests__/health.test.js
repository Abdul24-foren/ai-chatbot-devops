import request from 'supertest';
import { app } from '../src/server.js';

describe('Health endpoint', () => {
  it('returns ok status', async () => {
    const response = await request(app).get('/api/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
