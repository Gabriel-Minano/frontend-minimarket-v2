import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ReporteService, ReporteVentas } from '../../services/reporteService';

@Component({
    selector: 'app-reportes',
    imports: [FormsModule],
    templateUrl: './reportes.html',
    styleUrl: './reportes.css'
})
export class Reportes {
    private reporteService = inject(ReporteService);

    fechaInicio = this.formatearFecha(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    fechaFin = this.formatearFecha(new Date());

    reporte = signal<ReporteVentas | null>(null);
    cargando = signal(false);
    descargando = signal(false);
    error = signal('');

    //Los campos trabajan con fechas locales, sin conversiones a UTC.
    private formatearFecha(fecha: Date): string {
        const anio = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');

        return `${anio}-${mes}-${dia}`;
    }

    fechaMaxima(): string {
        if (!this.fechaInicio || !/^\d{4}-\d{2}-\d{2}$/.test(this.fechaInicio)) {
            return '';
        }

        const [anio, mes, dia] = this.fechaInicio.split('-').map(Number);
        const ultimoDia = new Date(anio + 1, mes, 0).getDate();
        const siguienteAnio = new Date(anio + 1, mes - 1, Math.min(dia, ultimoDia));

        return this.formatearFecha(siguienteAnio);
    }

    validarFechas(): string {
        if (!this.fechaInicio || !this.fechaFin) {
            return 'Selecciona ambas fechas.';
        }

        if (this.fechaFin < this.fechaInicio) {
            return 'La fecha final no puede ser anterior a la inicial.';
        }

        if (this.fechaFin > this.fechaMaxima()) {
            return 'El rango de búsqueda no puede superar un año.';
        }

        return '';
    }

    cambiarFechas(): void {
        this.reporte.set(null);
        this.error.set('');
    }

    generarReporte(): void {
        const mensaje = this.validarFechas();

        if (mensaje) {
            this.error.set(mensaje);
            return;
        }

        this.cargando.set(true);
        this.error.set('');
        this.reporte.set(null);

        this.reporteService.consultarVentas(this.fechaInicio, this.fechaFin).subscribe({
            next: (respuesta) => {
                this.cargando.set(false);

                if (!respuesta.success || !respuesta.data) {
                    this.error.set(respuesta.message || 'No se pudo generar el reporte.');
                    return;
                }

                this.reporte.set(respuesta.data);
            },
            error: (err: HttpErrorResponse) => {
                this.cargando.set(false);
                this.error.set(this.obtenerMensajeError(err, 'No se pudo generar el reporte.'));
            }
        });
    }

    descargarCsv(): void {
        const reporte = this.reporte();

        if (!reporte || this.validarFechas() || this.descargando()) {
            return;
        }

        this.descargando.set(true);
        this.error.set('');

        //Usar las fechas del reporte consultado para no exportar otro rango por accidente.
        this.reporteService.exportarVentas(reporte.fechaInicio, reporte.fechaFin).subscribe({
            next: (archivo) => {
                this.descargando.set(false);

                const url = URL.createObjectURL(archivo);
                const enlace = document.createElement('a');
                enlace.href = url;
                enlace.download = `reporte-ventas-${reporte.fechaInicio}-a-${reporte.fechaFin}.csv`;
                document.body.appendChild(enlace);
                enlace.click();
                enlace.remove();
                //Se libera después de iniciar la descarga para no cancelarla en algunos navegadores.
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            },
            error: (err: HttpErrorResponse) => {
                this.descargando.set(false);
                this.error.set(this.obtenerMensajeError(err, 'No se pudo descargar el reporte.'));
            }
        });
    }

    private obtenerMensajeError(err: HttpErrorResponse, mensajePorDefecto: string): string {
        if (err.status === 0) {
            return 'No se pudo conectar con el servidor.';
        }

        if (err.status === 403) {
            return 'No tienes permisos para consultar reportes.';
        }

        return err.error?.message || mensajePorDefecto;
    }
}
