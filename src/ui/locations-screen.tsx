'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Pencil, Plus, ArrowRight, Search } from 'lucide-react';
import type { Workspace } from '@/contracts/workspace';
import { locationUsage } from '@/domain/locations';
import { Empty } from './primitives';
import type { OpenDialog } from './screens';

const states = { active: 'Activas', paused: 'Pausadas', archived: 'Archivadas' };
export function LocationsScreen({ data, open }: { data: Workspace; open: OpenDialog }) {
  const [search, setSearch] = useState('');
  const [state, setState] = useState('all');
  const locations = data.locations.filter(
    (l) =>
      (state === 'all' || l.state === state) &&
      `${l.name} ${l.address}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')),
  );
  return (
    <>
      <div className="panel table-toolbar">
        <label className="search-box">
          <Search size={18} />
          <input
            aria-label="Buscar sedes"
            placeholder="Buscar por nombre o dirección"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          className="location-filter"
          aria-label="Estado de sede"
          value={state}
          onChange={(e) => setState(e.target.value)}
        >
          <option value="all">Todas las sedes ({data.locations.length})</option>
          {Object.entries(states).map(([key, label]) => (
            <option key={key} value={key}>
              {label} ({data.locations.filter((l) => l.state === key).length})
            </option>
          ))}
        </select>
      </div>
      <div className="locations-grid">
        {locations.map((l) => {
          const usage = locationUsage(data, l.id);
          return (
            <section className="panel venue-card" key={l.id}>
              <div className="venue-card-head">
                <span className="location-icon">
                  <MapPin size={24} />
                </span>
                <span className={`venue-state ${l.state}`}>
                  {l.state === 'active' ? 'Activa' : l.state === 'paused' ? 'Pausada' : 'Archivada'}
                </span>
              </div>
              <h2>{l.name}</h2>
              <p className="venue-address">{l.address || 'Todavía no cargaste una dirección.'}</p>
              <dl className="venue-facts">
                <div>
                  <dt>Servicios vigentes</dt>
                  <dd>{usage.currentServices}</dd>
                </div>
                <div>
                  <dt>Inscripciones vinculadas</dt>
                  <dd>{usage.activeEnrollments}</dd>
                </div>
              </dl>
              <div className="venue-actions">
                <button
                  className="button secondary"
                  aria-label={`Editar sede ${l.name}`}
                  onClick={() => open('location', l.id)}
                >
                  <Pencil size={16} /> Editar sede
                </button>
                <Link className="text-button" href="/?view=services">
                  Ver servicios <ArrowRight size={15} />
                </Link>
              </div>
            </section>
          );
        })}
      </div>
      {!locations.length && (
        <section className="panel">
          <Empty
            title={data.locations.length ? 'No hay sedes con ese filtro' : '¿Dónde vas a entrenar?'}
            action={
              <button className="button primary" onClick={() => open('location')}>
                <Plus size={17} /> Nueva sede
              </button>
            }
          >
            {data.locations.length
              ? 'Probá otro nombre o mostrá todos los estados.'
              : 'Creá tu primer lugar de entrenamiento. Podés cambiarlo o sumar otros cuando lo necesites.'}
          </Empty>
        </section>
      )}
      <p className="info-note">
        Cambiar una sede no mueve automáticamente los servicios ni modifica los contratos
        anteriores. Para trasladar una actividad, publicá sus nuevas condiciones desde Servicios.
      </p>
    </>
  );
}

export function LocationsSummary({ data, open }: { data: Workspace; open: OpenDialog }) {
  return (
    <section className="panel venue-summary">
      <MapPin size={28} />
      <h2>Sedes de entrenamiento</h2>
      <p>
        {data.locations.filter((l) => l.state === 'active').length} activas ·{' '}
        {data.locations.length} en total. Los lugares donde entrenás ahora tienen su propia sección.
      </p>
      <Link className="button primary" href="/?view=locations">
        Administrar sedes <ArrowRight size={17} />
      </Link>
      <button className="text-button" onClick={() => open('location')}>
        <Plus size={17} /> Nueva sede
      </button>
    </section>
  );
}
