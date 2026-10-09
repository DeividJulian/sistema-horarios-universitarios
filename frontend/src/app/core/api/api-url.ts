import { environment } from '../../../environments/environment';

export const API_URL = environment.apiUrl;

export interface ApiMessage {
  mensaje: string;
}
