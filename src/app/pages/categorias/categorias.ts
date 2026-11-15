import { Component, inject, OnInit, signal } from '@angular/core';
import { Categoria, CategoriaService } from '../../services/categoriaService';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  imports: [],
  selector: 'app-categorias',
  styleUrl: './categorias.css',
  templateUrl: './categorias.html',
})
export class Categorias implements OnInit {
  private categoriaService = inject(CategoriaService);

  categorias = signal<Categoria[]>([]);
  paginaActual = signal(0);
  totalPaginas = signal(0);
  cargando = signal(false);
  error = signal('');

  //Ejecución automática al cargar el componente
  ngOnInit(): void {
    this.cargarCategorias();
  }

  cargarCategorias(pagina: number = 0): void {
    this.cargando.set(true);
    this.error.set('');

    this.categoriaService.listarCategorias(pagina).subscribe({
      next: (respuesta) => {
        this.cargando.set(false);

        if (!respuesta.success || !respuesta.data) {
          this.error.set('No se pudieron obtener las categorías');
          return;
        }
        this.categorias.set(respuesta.data.content);
        this.paginaActual.set(respuesta.data.number);
        this.totalPaginas.set(respuesta.data.totalPages);
      },

      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(err.status === 0
          ? 'No se pudo conectar al servidor.'
          : err.error?.message || 'Error al obtener categorías.');
      }
    });
  }

  siguientePagina(): void {
    if (this.paginaActual() + 1 < this.totalPaginas()) {
      this.cargarCategorias(this.paginaActual() + 1);
    }
  }

  anteriorPagina(): void {
    if (this.paginaActual() > 0) {
      this.cargarCategorias(this.paginaActual() - 1);
    }
  }
}
