import { Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Venta, VentaRequest, VentaService } from '../../services/ventaService';
import { Producto, ProductoService } from '../../services/productoService';
import { AuthService } from '../../auth/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

interface ItemCarrito {
  producto: Producto;
  cantidad: number | null;
}

@Component({
  imports: [FormsModule],
  selector: 'app-ventas',
  styleUrl: './ventas.css',
  templateUrl: './ventas.html',
})
export class Ventas implements OnInit {
  private ventaService = inject(VentaService);
  private productoService = inject(ProductoService);
  private auth = inject(AuthService);

  @ViewChild('dialogVenta') dialogVenta?: ElementRef<HTMLDialogElement>;
  @ViewChild('dialogDetalle') dialogDetalle?: ElementRef<HTMLDialogElement>;

  //Listado de ventas
  ventas = signal<Venta[]>([]);
  paginaActual = signal(0);
  totalPaginas = signal(0);
  mostrandoActivas = true;
  cargando = signal(false);
  errorListado = signal('');

  //Productos disponibles para el registro
  productos = signal<Producto[]>([]);
  paginaProductos = signal(0);
  totalPaginasProductos = signal(0);
  busquedaProducto = '';
  busquedaAplicada = '';
  cargandoProductos = signal(false);
  errorProductos = signal('');

  //Carrito de venta
  carrito = signal<ItemCarrito[]>([]);
  guardando = signal(false);
  errorFormulario = signal('');

  //Detalle de venta
  ventaDetalle = signal<Venta | null>(null);
  cargandoDetalle = signal(false);
  errorDetalle = signal('');

  //Operaciones y mensajes
  procesandoId = signal<number | null>(null);
  mensajeOperacion = signal('');
  errorOperacion = signal('');

  ngOnInit(): void {
    this.cargarVentas();
  }

  esAdmin(): boolean {
    return this.auth.usuario()?.roles.includes('ROLE_ADMIN') ?? false;
  }

  private obtenerMensajeError(err: HttpErrorResponse, mensajePorDefecto: string): string {
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor.';
    }

    if (err.status === 403) {
      return 'No tienes permisos para realizar esta operación.';
    }

    const validaciones = err.status === 400 ? err.error?.data : null;

    if (validaciones && typeof validaciones === 'object' && !Array.isArray(validaciones)) {
      return Object.values(validaciones).join(' ');
    }

    return err.error?.message || mensajePorDefecto;
  }

  cargarVentas(pagina: number = 0): void {
    this.cargando.set(true);
    this.errorListado.set('');

    this.ventaService.listarVentas(pagina, this.mostrandoActivas).subscribe({
      next: (respuesta) => {
        if (!respuesta.success || !respuesta.data) {
          this.cargando.set(false);
          this.errorListado.set('No se pudieron obtener las ventas.');
          return;
        }

        if (pagina > 0 && pagina >= respuesta.data.totalPages) {
          this.cargarVentas(Math.max(0, respuesta.data.totalPages - 1));
          return;
        }

        this.ventas.set(respuesta.data.content);
        this.paginaActual.set(respuesta.data.number);
        this.totalPaginas.set(respuesta.data.totalPages);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorListado.set(this.obtenerMensajeError(err, 'Error al obtener ventas.'));
      }
    });
  }

  cambiarVista(activo: boolean): void {
    if (this.mostrandoActivas === activo || this.cargando() || this.procesandoId() !== null) {
      return;
    }

    this.mostrandoActivas = activo;
    this.mensajeOperacion.set('');
    this.errorOperacion.set('');
    this.cargarVentas(0);
  }

  cambiarPagina(desplazamiento: number): void {
    const nuevaPagina = this.paginaActual() + desplazamiento;

    if (!this.cargando() && nuevaPagina >= 0 && nuevaPagina < this.totalPaginas()) {
      this.cargarVentas(nuevaPagina);
    }
  }

  //Abrir el formulario y consultar los productos activos
  abrirFormulario(): void {
    if (this.cargando() || this.guardando() || this.procesandoId() !== null) {
      return;
    }

    this.carrito.set([]);
    this.busquedaProducto = '';
    this.busquedaAplicada = '';
    this.errorFormulario.set('');
    this.mensajeOperacion.set('');
    this.errorOperacion.set('');
    this.dialogVenta?.nativeElement.showModal();
    this.cargarProductos();
  }

  cerrarFormulario(): void {
    if (this.guardando()) {
      return;
    }

    this.dialogVenta?.nativeElement.close();
    this.carrito.set([]);
    this.errorFormulario.set('');
  }

  cancelarFormulario(event: Event): void {
    if (this.guardando()) {
      event.preventDefault();
      return;
    }

    this.carrito.set([]);
    this.errorFormulario.set('');
  }

  cargarProductos(pagina: number = 0): void {
    this.cargandoProductos.set(true);
    this.errorProductos.set('');

    this.productoService.listarProductos(pagina, true, this.busquedaAplicada).subscribe({
      next: (respuesta) => {
        if (!respuesta.success || !respuesta.data) {
          this.cargandoProductos.set(false);
          this.errorProductos.set('No se pudieron obtener los productos.');
          return;
        }

        this.productos.set(respuesta.data.content);
        this.paginaProductos.set(respuesta.data.number);
        this.totalPaginasProductos.set(respuesta.data.totalPages);
        this.cargandoProductos.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoProductos.set(false);
        this.errorProductos.set(this.obtenerMensajeError(err, 'Error al obtener productos.'));
      }
    });
  }

  buscarProductos(): void {
    if (this.cargandoProductos() || this.guardando()) {
      return;
    }

    this.busquedaAplicada = this.busquedaProducto.trim();
    this.cargarProductos(0);
  }

  cambiarPaginaProductos(desplazamiento: number): void {
    const nuevaPagina = this.paginaProductos() + desplazamiento;

    if (!this.cargandoProductos() && nuevaPagina >= 0 && nuevaPagina < this.totalPaginasProductos()) {
      this.cargarProductos(nuevaPagina);
    }
  }

  agregarProducto(producto: Producto): void {
    if (!producto.activo || producto.stock <= 0 || this.guardando()) {
      return;
    }

    const existente = this.carrito().find(item => item.producto.id === producto.id);

    if (existente) {
      if (existente.cantidad === null || existente.cantidad >= producto.stock) {
        this.errorFormulario.set('No puedes superar el stock disponible.');
        return;
      }

      this.carrito.update(items => items.map(item => item.producto.id === producto.id
        ? { ...item, cantidad: (item.cantidad ?? 0) + 1 }
        : item
      ));
    } else {
      this.carrito.update(items => [...items, { producto, cantidad: 1 }]);
    }

    this.errorFormulario.set('');
  }

  cambiarCantidad(idProducto: number, cantidad: number | null): void {
    this.carrito.update(items => items.map(item => item.producto.id === idProducto
      ? { ...item, cantidad }
      : item
    ));
  }

  quitarProducto(idProducto: number): void {
    this.carrito.update(items => items.filter(item => item.producto.id !== idProducto));
    this.errorFormulario.set('');
  }

  cantidadValida(item: ItemCarrito): boolean {
    return item.cantidad !== null && Number.isInteger(item.cantidad)
      && item.cantidad > 0 && item.cantidad <= item.producto.stock;
  }

  carritoValido(): boolean {
    return this.carrito().length > 0 && this.carrito().every(item => this.cantidadValida(item));
  }

  subtotal(item: ItemCarrito): number {
    if (!this.cantidadValida(item)) {
      return 0;
    }

    return Math.round(item.producto.precio * 100) * item.cantidad! / 100;
  }

  totalCarrito(): number {
    return this.carrito().reduce((total, item) => total + this.subtotal(item), 0);
  }

  registrarVenta(): void {
    if (this.guardando() || !this.carritoValido()) {
      this.errorFormulario.set('Agrega productos y revisa que las cantidades sean válidas.');
      return;
    }

    const venta: VentaRequest = {
      detalles: this.carrito().map(item => ({
        idProducto: item.producto.id,
        cantidad: item.cantidad!
      }))
    };

    this.guardando.set(true);
    this.errorFormulario.set('');

    this.ventaService.registrarVenta(venta).subscribe({
      next: (respuesta) => {
        this.guardando.set(false);

        if (!respuesta.success || !respuesta.data) {
          this.errorFormulario.set(respuesta.message || 'No se pudo registrar la venta.');
          return;
        }

        this.cerrarFormulario();
        this.mostrandoActivas = true;
        this.mensajeOperacion.set(`Venta N.° ${respuesta.data.idVenta} registrada correctamente.`);
        this.cargarVentas(0);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorFormulario.set(this.obtenerMensajeError(err, 'Error al registrar la venta.'));
      }
    });
  }

  verDetalle(venta: Venta): void {
    this.ventaDetalle.set(null);
    this.errorDetalle.set('');
    this.cargandoDetalle.set(true);
    this.dialogDetalle?.nativeElement.showModal();

    this.ventaService.obtenerVenta(venta.idVenta).subscribe({
      next: (respuesta) => {
        this.cargandoDetalle.set(false);

        if (!respuesta.success || !respuesta.data) {
          this.errorDetalle.set('No se pudo obtener el detalle de la venta.');
          return;
        }

        this.ventaDetalle.set(respuesta.data);
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoDetalle.set(false);
        this.errorDetalle.set(this.obtenerMensajeError(err, 'Error al obtener el detalle.'));
      }
    });
  }

  cerrarDetalle(): void {
    this.dialogDetalle?.nativeElement.close();
  }

  anularVenta(venta: Venta): void {
    if (!this.esAdmin() || !venta.activo || this.cargando() || this.procesandoId() !== null) {
      return;
    }

    if (!window.confirm(`¿Deseas anular la venta N.° ${venta.idVenta}? Se devolverá el stock.`)) {
      return;
    }

    this.procesandoId.set(venta.idVenta);
    this.mensajeOperacion.set('');
    this.errorOperacion.set('');

    this.ventaService.anularVenta(venta.idVenta).subscribe({
      next: (respuesta) => {
        this.procesandoId.set(null);

        if (!respuesta.success) {
          this.errorOperacion.set(respuesta.message || 'No se pudo anular la venta.');
          return;
        }

        this.mensajeOperacion.set(respuesta.message);
        this.cargarVentas(this.paginaActual());
      },
      error: (err: HttpErrorResponse) => {
        this.procesandoId.set(null);
        this.errorOperacion.set(this.obtenerMensajeError(err, 'Error al anular la venta.'));
      }
    });
  }

  formatearFecha(fecha: string): string {
    return fecha.replace('T', ' ').substring(0, 16);
  }

}
