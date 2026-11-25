import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Usuarios } from './usuarios';

describe('Usuarios', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Usuarios],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
  });

  it('should create', () => {
    const component = TestBed.createComponent(Usuarios).componentInstance;
    expect(component).toBeTruthy();
  });

  it('debe permitir seleccionar y quitar roles', () => {
    const component = TestBed.createComponent(Usuarios).componentInstance;
    component.cambiarRol(1, true);
    component.cambiarRol(2, true);
    component.cambiarRol(1, false);

    expect(component.rolesSeleccionados).toEqual([2]);
  });
});
