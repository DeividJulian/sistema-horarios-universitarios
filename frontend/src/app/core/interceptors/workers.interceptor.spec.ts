import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ConnectionService } from '../services/connection.service';
import { TabSyncService } from '../services/tab-sync.service';
import { workersInterceptor } from './workers.interceptor';

describe('workersInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const tabSync = { notifyChange: vi.fn() };
  const connection = { markDataFromCache: vi.fn() };

  beforeEach(() => {
    tabSync.notifyChange.mockReset();
    connection.markDataFromCache.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([workersInterceptor])),
        provideHttpClientTesting(),
        { provide: TabSyncService, useValue: tabSync },
        { provide: ConnectionService, useValue: connection },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  it('tells the other tabs when a block is moved', () => {
    http.put('http://api/schedules/3', {}).subscribe();
    backend.expectOne('http://api/schedules/3').flush({});
    expect(tabSync.notifyChange).toHaveBeenCalledWith('PUT /schedules/3');
  });

  it('does not notify on failed writes or on writes that do not touch the schedule', () => {
    http.put('http://api/schedules/3', {}).subscribe({ error: () => undefined });
    backend.expectOne('http://api/schedules/3').flush({}, { status: 409, statusText: 'Conflict' });
    http.post('http://api/classrooms', {}).subscribe();
    backend.expectOne('http://api/classrooms').flush({});
    expect(tabSync.notifyChange).not.toHaveBeenCalled();
  });

  it('reports when a GET was answered from the Service Worker cache', () => {
    http.get('http://api/schedules').subscribe();
    backend.expectOne('http://api/schedules').flush([], { headers: { 'X-From-Cache': '1' } });
    expect(connection.markDataFromCache).toHaveBeenCalledWith(true);
  });
});
