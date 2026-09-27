import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { forkJoin } from 'rxjs';
import { HorarioService, Horario, Materia, Aula } from './horario.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
    <div class="contenedor">
      <h1>Sistema de Horarios y Aulas Universitarias</h1>
      <button (click)="generarHorario()">Generar Horario Automáticamente</button>
      <p class="ayuda">Arrastra un bloque a otra casilla vacía para moverlo manualmente.</p>

      <div cdkDropListGroup class="calendario">
        <div class="fila fila-header">
          <div class="celda-hora"></div>
          <div class="celda-dia" *ngFor="let dia of dias">{{ dia }}</div>
        </div>

        <div class="fila" *ngFor="let hora of horas">
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
            >
              <strong>{{ nombreMateria(h.materia_id) }}</strong>
              <span>{{ nombreAula(h.aula_id) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .contenedor {
      font-family: Arial, sans-serif;
      padding: 20px;
    }
    button {
      background-color: #6a1b9a;
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
    .ayuda {
      color: #555;
      font-size: 13px;
      margin: 8px 0 16px 0;
    }
    .calendario {
      display: flex;
      flex-direction: column;
      border: 1px solid #ccc;
      width: fit-content;
    }
    .fila {
      display: flex;
    }
    .fila-header {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .celda-hora {
      width: 70px;
      min-width: 70px;
      padding: 8px;
      text-align: center;
      border: 1px solid #ddd;
      box-sizing: border-box;
    }
    .celda-dia {
      width: 150px;
      min-width: 150px;
      padding: 8px;
      text-align: center;
      border: 1px solid #ddd;
      box-sizing: border-box;
    }
    .celda {
      width: 150px;
      min-width: 150px;
      height: 60px;
      border: 1px solid #ddd;
      box-sizing: border-box;
      padding: 4px;
    }
    .bloque {
      background-color: #ede7f6;
      border-left: 4px solid #6a1b9a;
      border-radius: 4px;
      padding: 6px;
      font-size: 12px;
      height: 100%;
      box-sizing: border-box;
      cursor: grab;
      display: flex;
      flex-direction: column;
      touch-action: none;
    }
    .cdk-drag-preview {
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }
    .cdk-drag-placeholder {
      opacity: 0.3;
    }
  `]
})
export class App implements OnInit {
  dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  horas = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  horarios = signal<Horario[]>([]);
  materiasMap = signal<Map<number, Materia>>(new Map());
  aulasMap = signal<Map<number, Aula>>(new Map());

  todasLasCeldas: string[] = [];

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
    }).subscribe(({ materias, aulas, horarios }) => {
      this.materiasMap.set(new Map(materias.map((m) => [m.id, m])));
      this.aulasMap.set(new Map(aulas.map((a) => [a.id, a])));
      this.horarios.set(horarios);
    });
  }

  generarHorario(): void {
    this.horarioService.generarHorario().subscribe({
      next: () => this.cargarDatos(),
      error: (err) => alert(err.error?.detail || 'No se pudo generar el horario'),
    });
  }

  idCelda(dia: string, hora: number): string {
    return `${dia}-${hora}`;
  }

  obtenerHorario(dia: string, hora: number): Horario | null {
    return (
      this.horarios().find(
        (h) => h.dia_semana === dia && parseInt(h.hora_inicio.split(':')[0], 10) === hora
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

    this.horarioService
      .moverHorario(horario.id, { dia_semana: diaDestino, hora_inicio: horaTexto })
      .subscribe({
        next: (actualizado) => {
          this.horarios.update((lista) =>
            lista.map((h) => (h.id === actualizado.id ? actualizado : h))
          );
        },
        error: (err) => alert(err.error?.detail || 'No se pudo mover el horario'),
      });
  }
}