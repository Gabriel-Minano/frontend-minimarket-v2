import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { Rol, Usuario, UsuarioUpdateRequest, UsuarioService } from '../../services/usuarioService';

@Component({
  imports: [FormsModule],
  selector: 'app-usuarios',
  styleUrl: './usuarios.css',
  templateUrl: './usuarios.html',
})
export class Usuarios implements OnInit {
  private usuarioService = inject(UsuarioService);
  private auth = inject(AuthService);
  private router = inject(Router);

  @ViewChild('dialogUsuario') dialogUsuario?: ElementRef<HTMLDialogElement>;

  //Listado y paginación
  usuarios = signal<Usuario[]>([]);
  paginaActual = signal(0);
  totalPaginas = signal(0);
  cargando = signal(false);
  errorListado = signal('');
  mostrandoActivos = true;

  //Roles para el formulario
  roles = signal<Rol[]>([]);
  cargandoRoles = signal(true);
  errorRoles = signal('');

  //Formulario para registrar y editar
  nombre = '';
  apellido = '';
  email = '';
  password = '';
  rolesSeleccionados: number[] = [];
  idEditando: number | null = null;
  emailAnterior = '';
  guardando = signal(false);
  errorFormulario = signal('');

  //Mensajes y cambios de estado
  procesandoId = signal<number | null>(null);
  mensajeOperacion = signal('');
  errorOperacion = signal('');

  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarRoles();
  }

  cargarUsuarios(pagina: number = 0): void {
    this.cargando.set(true);
    this.errorListado.set('');

    this.usuarioService.listarUsuarios(pagina, this.mostrandoActivos).subscribe({
      next: (respuesta) => {
        if (!respuesta.success || !respuesta.data) {
          this.cargando.set(false);
          this.errorListado.set('No se pudieron obtener los usuarios.');
          return;
        }

        //Regresar a una página válida cuando se modifica el último registro
        if (pagina > 0 && pagina >= respuesta.data.totalPages) {
          this.cargarUsuarios(Math.max(0, respuesta.data.totalPages - 1));
          return;
        }

        this.usuarios.set(respuesta.data.content);
        this.paginaActual.set(respuesta.data.number);
        this.totalPaginas.set(respuesta.data.totalPages);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorListado.set(this.obtenerMensajeError(err, 'Error al obtener usuarios.'));
      }
    });
  }

  cargarRoles(): void {
    this.cargandoRoles.set(true);
    this.errorRoles.set('');

    this.usuarioService.listarRoles().subscribe({
      next: (respuesta) => {
        this.cargandoRoles.set(false);

        if (!respuesta.success || !respuesta.data) {
          this.errorRoles.set('No se pudieron obtener los roles.');
          return;
        }

        this.roles.set(respuesta.data);
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoRoles.set(false);
        this.errorRoles.set(this.obtenerMensajeError(err, 'Error al obtener roles.'));
      }
    });
  }

  cambiarVista(activo: boolean): void {
    if (this.mostrandoActivos === activo || this.cargando() || this.guardando() || this.procesandoId() !== null) {
      return;
    }

    this.mostrandoActivos = activo;
    this.mensajeOperacion.set('');
    this.errorOperacion.set('');
    this.cargarUsuarios(0);
  }

  cambiarPagina(desplazamiento: number): void {
    const nuevaPagina = this.paginaActual() + desplazamiento;

    if (!this.cargando() && nuevaPagina >= 0 && nuevaPagina < this.totalPaginas()) {
      this.cargarUsuarios(nuevaPagina);
    }
  }

  nombreRol(nombre: string): string {
    if (nombre === 'ROLE_ADMIN') return 'Administrador';
    if (nombre === 'ROLE_CAJERO') return 'Cajero';
    return nombre;
  }

  mostrarRoles(usuario: Usuario): string {
    return usuario.roles.map(rol => this.nombreRol(rol.nombre)).join(', ') || 'Sin roles';
  }

  cambiarRol(id: number, seleccionado: boolean): void {
    if (seleccionado) {
      if (!this.rolesSeleccionados.includes(id)) {
        this.rolesSeleccionados = [...this.rolesSeleccionados, id];
      }
    } else {
      this.rolesSeleccionados = this.rolesSeleccionados.filter(rolId => rolId !== id);
    }
  }

  abrirFormulario(usuario?: Usuario): void {
    if (this.cargando() || this.guardando() || this.procesandoId() !== null || this.cargandoRoles() || this.errorRoles()) {
      return;
    }

    this.idEditando = usuario?.id ?? null;
    this.nombre = usuario?.nombre ?? '';
    this.apellido = usuario?.apellido ?? '';
    this.email = usuario?.email ?? '';
    this.emailAnterior = usuario?.email ?? '';
    this.password = '';
    this.rolesSeleccionados = usuario?.roles.map(rol => rol.id) ?? [];
    this.errorFormulario.set('');
    this.mensajeOperacion.set('');
    this.errorOperacion.set('');

    this.dialogUsuario?.nativeElement.showModal();
  }

  cerrarFormulario(): void {
    if (this.guardando()) {
      return;
    }

    this.dialogUsuario?.nativeElement.close();
    this.limpiarFormulario();
  }

  cancelarDialogo(event: Event): void {
    if (this.guardando()) {
      event.preventDefault();
      return;
    }

    this.limpiarFormulario();
  }

  guardarUsuario(): void {
    if (this.guardando() || this.procesandoId() !== null) {
      return;
    }

    this.errorFormulario.set('');

    const nombre = this.nombre.trim();
    const apellido = this.apellido.trim();
    const email = this.email.trim();
    const password = this.password;

    if (!nombre || !apellido || !email) {
      this.errorFormulario.set('Completa el nombre, apellido y correo.');
      return;
    }

    if (nombre.length > 100 || apellido.length > 100 || email.length > 150) {
      this.errorFormulario.set('Se superó la longitud permitida en algún campo.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.errorFormulario.set('Ingresa un correo electrónico válido.');
      return;
    }

    if (this.idEditando === null && !password.trim()) {
      this.errorFormulario.set('La contraseña es obligatoria.');
      return;
    }

    if (password && (password.length < 6 || !password.trim())) {
      this.errorFormulario.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (this.rolesSeleccionados.length === 0) {
      this.errorFormulario.set('Selecciona al menos un rol.');
      return;
    }

    const id = this.idEditando;
    const paginaRecargar = id === null ? 0 : this.paginaActual();
    const cambiandoCorreoPropio = id !== null && this.emailAnterior === this.auth.usuario()?.email && email !== this.emailAnterior;
    const quitandoAdminPropio = id !== null && this.emailAnterior === this.auth.usuario()?.email
      && !this.roles().filter(rol => this.rolesSeleccionados.includes(rol.id)).some(rol => rol.nombre === 'ROLE_ADMIN');

    const datos: UsuarioUpdateRequest = {
      nombre,
      apellido,
      email,
      idRoles: this.rolesSeleccionados
    };

    //El backend conserva la contraseña al editar cuando no se envía
    if (password) {
      datos.password = password;
    }

    const peticion = id === null
      ? this.usuarioService.crearUsuario({ nombre, apellido, email, password, idRoles: this.rolesSeleccionados })
      : this.usuarioService.actualizarUsuario(id, datos);

    this.guardando.set(true);

    peticion.subscribe({
      next: (respuesta) => {
        this.guardando.set(false);

        if (!respuesta.success || !respuesta.data) {
          this.errorFormulario.set(respuesta.message || 'No se pudo guardar el usuario.');
          return;
        }

        this.cerrarFormulario();

        //Si el administrador cambia su propio correo o elimina su rol, debe iniciar sesión nuevamente
        if (cambiandoCorreoPropio || quitandoAdminPropio) {
          this.auth.cerrarSesion();
          void this.router.navigateByUrl('/login');
          return;
        }

        this.mensajeOperacion.set(respuesta.message);
        this.cargarUsuarios(paginaRecargar);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorFormulario.set(this.obtenerMensajeError(err, 'Error al guardar el usuario.'));
      }
    });
  }

  cambiarEstadoUsuario(usuario: Usuario): void {
    if (this.cargando() || this.guardando() || this.procesandoId() !== null) {
      return;
    }

    if (usuario.activo) {
      const esMiCuenta = usuario.email === this.auth.usuario()?.email;
      const aviso = esMiCuenta
        ? '¿Deseas desactivar tu propia cuenta? Se cerrará tu sesión y necesitarás otro administrador para reactivarla.'
        : `¿Deseas desactivar al usuario "${usuario.nombre} ${usuario.apellido}"?`;

      if (!window.confirm(aviso)) {
        return;
      }
    }

    const peticion: Observable<{ success: boolean; message: string }> = usuario.activo
      ? this.usuarioService.desactivarUsuario(usuario.id)
      : this.usuarioService.reactivarUsuario(usuario.id);

    this.procesandoId.set(usuario.id);
    this.mensajeOperacion.set('');
    this.errorOperacion.set('');

    peticion.subscribe({
      next: (respuesta) => {
        this.procesandoId.set(null);

        if (!respuesta.success) {
          this.errorOperacion.set(respuesta.message || 'No se pudo cambiar el estado del usuario.');
          return;
        }

        if (usuario.activo && usuario.email === this.auth.usuario()?.email) {
          this.auth.cerrarSesion();
          void this.router.navigateByUrl('/login');
          return;
        }

        this.mensajeOperacion.set(respuesta.message);
        this.cargarUsuarios(this.paginaActual());
      },
      error: (err: HttpErrorResponse) => {
        this.procesandoId.set(null);
        this.errorOperacion.set(this.obtenerMensajeError(err, 'Error al cambiar el estado del usuario.'));
      }
    });
  }

  private limpiarFormulario(): void {
    this.idEditando = null;
    this.nombre = '';
    this.apellido = '';
    this.email = '';
    this.emailAnterior = '';
    this.password = '';
    this.rolesSeleccionados = [];
    this.errorFormulario.set('');
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
}
