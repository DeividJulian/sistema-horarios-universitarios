import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { forkJoin } from 'rxjs';
import { HorarioService, Horario, Materia, Aula, Grupo, Profesor } from './horario.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
    <div class="app">
      <header class="cabecera">
        <div class="cabecera-texto">
          <p class="etiqueta">Panel de programación académica</p>
          <h1>Sistema de Horarios y Aulas</h1>
        </div>
        <button class="btn-primario" (click)="generarHorario()">
          Generar horario automáticamente
        </button>
      </header>

      <section class="panel-filtros">
        <div class="filtro">
          <span class="filtro-label">Profesor</span>
          <select (change)="onFiltroProfesor($any($event.target).value)">
            <option value="">Todos</option>
            <option *ngFor="let p of profesores()" [value]="p.id">{{ p.nombre }}</option>
          </select>
        </div>

        <div class="filtro">
          <span class="filtro-label">Grupo</span>
          <select (change)="onFiltroGrupo($any($event.target).value)">
            <option value="">Todos</option>
            <option *ngFor="let g of grupos()" [value]="g.id">{{ g.nombre }}</option>
          </select>
        </div>

        <div class="filtro">
          <span class="filtro-label">Aula</span>
          <select (change)="onFiltroAula($any($event.target).value)">
            <option value="">Todas</option>
            <option *ngFor="let a of aulas()" [value]="a.id">{{ a.nombre }}</option>
          </select>
        </div>

        <button class="btn-secundario" (click)="limpiarFiltros()">Quitar filtros</button>
      </section>

      <p class="ayuda">Arrastra un bloque a una casilla vacía para reprogramarlo.</p>

      <section class="tablero" cdkDropListGroup>
        <div class="fila fila-cabecera">
          <div class="celda-hora"></div>
          <div class="celda-dia" *ngFor="let dia of dias">{{ dia }}</div>
        </div>

        <div class="fila" [class.fila-par]="esFilaPar(hora)" *ngFor="let hora of horas">
          <div class="celda-hora">{{ hora }}:00</div>

          <div
            class="celda"
            *ngFor="let dia of dias"
            cdkDropList
            [id]="idCelda(dia, hora)"
            [cdkDropListConnectedTo]="todasLasCeldas"
            [cdkDropListData]="obtenerHorario(dia, hora)"
            (cdkDropListDropped)="onDrop($event, dia, hora)"
          >
            <div
              *ngIf="obtenerHorario(dia, hora) as h"
              cdkDrag
              [cdkDragData]="h"
              class="bloque"
              [style.borderLeftColor]="colorMateria(h.materia_id)"
            >
              <span class="bloque-punto" [style.backgroundColor]="colorMateria(h.materia_id)"></span>
              <div class="bloque-texto">
                <strong>{{ nombreMateria(h.materia_id) }}</strong>
                <span>{{ nombreAula(h.aula_id) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

    :host {
      --fondo: #12181f;
      --panel: #1c2530;
      --panel-alt: #202a37;
      --borde: #2b3644;
      --texto: #eef1f5;
      --texto-tenue: #8592a3;
      --acento: #f5a623;
    }

    .app {
      font-family: 'Manrope', sans-serif;
      background-color: var(--fondo);
      color: var(--texto);
      min-height: 100vh;
      padding: 32px 40px 60px;
      box-sizing: border-box;
    }

    .cabecera {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 28px;
    }

    .etiqueta {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--acento);
      letter-spacing: 0.04em;
      margin: 0 0 6px 0;
    }

    h1 {
      margin: 0;
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.01em;
    }

    .btn-primario {
      background-color: var(--acento);
      color: #1a1305;
      border: none;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      font-family: 'Manrope', sans-serif;
    }

    .btn-primario:hover {
      filter: brightness(1.08);
    }

    .panel-filtros {
      display: flex;
      align-items: flex-end;
      gap: 20px;
      flex-wrap: wrap;
      background-color: var(--panel);
      border: 1px solid var(--borde);
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 10px;
    }

    .filtro {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .filtro-label {
      font-size: 12px;
      color: var(--texto-tenue);
      font-weight: 700;
    }

    .filtro select {
      background-color: var(--panel-alt);
      color: var(--texto);
      border: 1px solid var(--borde);
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 13px;
      min-width: 170px;
      font-family: 'Manrope', sans-serif;
    }

    .btn-secundario {
      background: transparent;
      color: var(--texto-tenue);
      border: 1px solid var(--borde);
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      font-family: 'Manrope', sans-serif;
    }

    .btn-secundario:hover {
      color: var(--texto);
      border-color: var(--texto-tenue);
    }

    .ayuda {
      color: var(--texto-tenue);
      font-size: 13px;
      margin: 10px 0 20px 0;
    }

    .tablero {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--borde);
      border-radius: 10px;
      overflow: hidden;
      width: fit-content;
    }

    .fila {
      display: flex;
    }

    .fila-cabecera {
      background-color: var(--panel-alt);
    }

    .fila-par {
      background-color: rgba(255, 255, 255, 0.02);
    }

    .celda-hora {
      width: 76px;
      min-width: 76px;
      padding: 10px 8px;
      text-align: center;
      border-right: 1px solid var(--borde);
      border-bottom: 1px solid var(--borde);
      box-sizing: border-box;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--texto-tenue);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .fila-cabecera .celda-hora {
      border-bottom: none;
    }

    .celda-dia {
      width: 160px;
      min-width: 160px;
      padding: 12px 8px;
      text-align: center;
      border-right: 1px solid var(--borde);
      box-sizing: border-box;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .celda {
      width: 160px;
      min-width: 160px;
      height: 64px;
      border-right: 1px solid var(--borde);
      border-bottom: 1px solid var(--borde);
      box-sizing: border-box;
      padding: 5px;
    }

    .bloque {
      background-color: var(--panel-alt);
      border-left: 3px solid var(--acento);
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 12px;
      height: 100%;
      box-sizing: border-box;
      cursor: grab;
      display: flex;
      align-items: flex-start;
      gap: 6px;
      touch-action: none;
    }

    .bloque-punto {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      margin-top: 4px;
      flex-shrink: 0;
    }

    .bloque-texto {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .bloque-texto strong {
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .bloque-texto span {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--texto-tenue);
    }

    .cdk-drag-preview {
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
    }

    .cdk-drag-placeholder {
      opacity: 0.25;
    }
  `]
})
export class App implements OnInit {
  dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  horas = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  horarios = signal<Horario[]>([]);
  materiasMap = signal<Map<number, Materia>>(new Map());
  aulasMap = signal<Map<number, Aula>>(new Map());

  profesores = signal<Profesor[]>([]);
  grupos = signal<Grupo[]>([]);
  aulas = signal<Aula[]>([]);

  filtroProfesor = signal<number | null>(null);
  filtroGrupo = signal<number | null>(null);
  filtroAula = signal<number | null>(null);

  todasLasCeldas: string[] = [];

  private paletaMaterias = ['#f5a623', '#2dd4bf', '#fb7185', '#38bdf8', '#a78bfa', '#a3e635'];

  constructor(private horarioService: HorarioService) {}

  ngOnInit(): void {
    for (const dia of this.dias) {
      for (const hora of this.horas) {
        this.todasLasCeldas.push(this.idCelda(dia, hora));
      }
    }
    this.cargarDatos();
  }

  cargarDatos(): void {
    forkJoin({
      materias: this.horarioService.getMaterias(),
      aulas: this.horarioService.getAulas(),
      horarios: this.horarioService.getHorarios(),
      profesores: this.horarioService.getProfesores(),
      grupos: this.horarioService.getGrupos(),
    }).subscribe(({ materias, aulas, horarios, profesores, grupos }) => {
      this.materiasMap.set(new Map(materias.map((m) => [m.id, m])));
      this.aulasMap.set(new Map(aulas.map((a) => [a.id, a])));
      this.horarios.set(horarios);
      this.profesores.set(profesores);
      this.grupos.set(grupos);
      this.aulas.set(aulas);
    });
  }

  generarHorario(): void {
    this.horarioService.generarHorario().subscribe({
      next: () => this.cargarDatos(),
      error: (err) => alert(err.error?.detail || 'No se pudo generar el horario'),
    });
  }

  onFiltroProfesor(valor: string): void {
    this.filtroProfesor.set(valor === '' ? null : Number(valor));
  }

  onFiltroGrupo(valor: string): void {
    this.filtroGrupo.set(valor === '' ? null : Number(valor));
  }

  onFiltroAula(valor: string): void {
    this.filtroAula.set(valor === '' ? null : Number(valor));
  }

  limpiarFiltros(): void {
    this.filtroProfesor.set(null);
    this.filtroGrupo.set(null);
    this.filtroAula.set(null);
  }

  idCelda(dia: string, hora: number): string {
    return `${dia}-${hora}`;
  }

  esFilaPar(hora: number): boolean {
    return this.horas.indexOf(hora) % 2 === 1;
  }

  colorMateria(materiaId: number): string {
    return this.paletaMaterias[materiaId % this.paletaMaterias.length];
  }

  horarioVisible(h: Horario): boolean {
    const materia = this.materiasMap().get(h.materia_id);
    if (!materia) return false;
    if (this.filtroProfesor() !== null && materia.profesor_id !== this.filtroProfesor()) return false;
    if (this.filtroGrupo() !== null && materia.grupo_id !== this.filtroGrupo()) return false;
    if (this.filtroAula() !== null && h.aula_id !== this.filtroAula()) return false;
    return true;
  }

  obtenerHorario(dia: string, hora: number): Horario | null {
    return (
      this.horarios().find(
        (h) =>
          h.dia_semana === dia &&
          parseInt(h.hora_inicio.split(':')[0], 10) === hora &&
          this.horarioVisible(h)
      ) ?? null
    );
  }

  nombreMateria(id: number): string {
    return this.materiasMap().get(id)?.nombre ?? '—';
  }

  nombreAula(id: number): string {
    return this.aulasMap().get(id)?.nombre ?? '—';
  }

  onDrop(event: CdkDragDrop<Horario | null>, diaDestino: string, horaDestino: number): void {
    if (event.previousContainer === event.container) return;

    const horario: Horario | undefined = event.item.data;
    if (!horario) return;

    const yaOcupado = this.obtenerHorario(diaDestino, horaDestino);
    if (yaOcupado) {
      alert('Esa casilla ya está ocupada. Elige una casilla vacía.');
      return;
    }

    const horaTexto = `${horaDestino.toString().padStart(2, '0')}:00:00`;
    const estadoAnterior = {
      dia_semana: horario.dia_semana,
      hora_inicio: horario.hora_inicio,
      hora_fin: horario.hora_fin,
    };

    this.horarios.update((lista) =>
      lista.map((h) =>
        h.id === horario.id
          ? {
              ...h,
              dia_semana: diaDestino,
              hora_inicio: horaTexto,
              hora_fin: `${(horaDestino + 1).toString().padStart(2, '0')}:00:00`,
            }
          : h
      )
    );

    this.horarioService
      .moverHorario(horario.id, { dia_semana: diaDestino, hora_inicio: horaTexto })
      .subscribe({
        next: (actualizado) => {
          this.horarios.update((lista) =>
            lista.map((h) => (h.id === actualizado.id ? actualizado : h))
          );
        },
        error: (err) => {
          this.horarios.update((lista) =>
            lista.map((h) => (h.id === horario.id ? { ...h, ...estadoAnterior } : h))
          );
          alert(err.error?.detail || 'No se pudo mover el horario');
        },
      });
  }
}