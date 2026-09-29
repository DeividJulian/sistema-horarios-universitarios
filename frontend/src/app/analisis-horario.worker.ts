/// <reference lib="webworker" />

import { Horario, Materia, Profesor, Aula } from './horario.service';

export interface ResultadoAnalisis {
  huecosPorProfesor: { profesorNombre: string; horasLibresEntreClases: number }[];
  ocupacionPorAula: { aulaNombre: string; horasOcupadas: number; porcentajeOcupacion: number }[];
}

interface DatosEntrada {
  horarios: Horario[];
  materias: Materia[];
  profesores: Profesor[];
  aulas: Aula[];
}

addEventListener('message', ({ data }: { data: DatosEntrada }) => {
  const resultado = analizarHorario(data);
  postMessage(resultado);
});

function analizarHorario(data: DatosEntrada): ResultadoAnalisis {
  const { horarios, materias, profesores, aulas } = data;
  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  // --- Huecos (franjas muertas) por profesor ---
  const huecosPorProfesor = profesores.map((profesor) => {
    const materiasDelProfesor = materias.filter((m) => m.profesor_id === profesor.id);
    const idsMateria = new Set(materiasDelProfesor.map((m) => m.id));
    const horariosDelProfesor = horarios.filter((h) => idsMateria.has(h.materia_id));

    let horasLibres = 0;
    for (const dia of dias) {
      const horasDelDia = horariosDelProfesor
        .filter((h) => h.dia_semana === dia)
        .map((h) => parseInt(h.hora_inicio.split(':')[0], 10))
        .sort((a, b) => a - b);

      for (let i = 1; i < horasDelDia.length; i++) {
        const hueco = horasDelDia[i] - horasDelDia[i - 1] - 1;
        if (hueco > 0) horasLibres += hueco;
      }
    }

    return { profesorNombre: profesor.nombre, horasLibresEntreClases: horasLibres };
  });

  // --- Ocupación por aula (sobre una semana de 6:00 a 20:00, 5 días = 70 bloques posibles) ---
  const bloquesPorSemana = 5 * 14;
  const ocupacionPorAula = aulas.map((aula) => {
    const horasOcupadas = horarios.filter((h) => h.aula_id === aula.id).length;
    return {
      aulaNombre: aula.nombre,
      horasOcupadas,
      porcentajeOcupacion: Math.round((horasOcupadas / bloquesPorSemana) * 100),
    };
  });

  return { huecosPorProfesor, ocupacionPorAula };
}