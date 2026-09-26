import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from './api-config';

export interface Profesor {
  id: number;
  nombre: string;
  email: string;
}

export interface Aula {
  id: number;
  nombre: string;
  aforo: number;
}

export interface Grupo {
  id: number;
  nombre: string;
  num_estudiantes: number;
}

export interface Materia {
  id: number;
  nombre: string;
  intensidad_horaria: number;
  grupo_id: number;
  profesor_id: number;
}

export interface Horario {
  id: number;
  materia_id: number;
  aula_id: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
}

@Injectable({ providedIn: 'root' })
export class HorarioService {
  constructor(private http: HttpClient) {}

  getProfesores(): Observable<Profesor[]> {
    return this.http.get<Profesor[]>(`${API_URL}/profesores`);
  }

  getAulas(): Observable<Aula[]> {
    return this.http.get<Aula[]>(`${API_URL}/aulas`);
  }

  getGrupos(): Observable<Grupo[]> {
    return this.http.get<Grupo[]>(`${API_URL}/grupos`);
  }

  getMaterias(): Observable<Materia[]> {
    return this.http.get<Materia[]>(`${API_URL}/materias`);
  }

  getHorarios(): Observable<Horario[]> {
    return this.http.get<Horario[]>(`${API_URL}/horarios`);
  }

  generarHorario(): Observable<Horario[]> {
    return this.http.post<Horario[]>(`${API_URL}/generar-horario`, {});
  }
}