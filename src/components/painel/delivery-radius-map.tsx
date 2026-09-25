'use client';

import 'leaflet/dist/leaflet.css';
import './delivery-radius-map.css';
import type * as Leaflet from 'leaflet';
import { Crosshair, MapPin, MapPinOff } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import {
  addressPoint,
  addressQuery,
  clampRadius,
  formatRadius,
  isSearchableAddress,
  FALLBACK_CENTER,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  RADIUS_STEP_KM,
  type Coordinates,
} from '@/lib/delivery-area';
import type { BusinessAddress } from '@/lib/types';

/** Raio sugerido quando o lojista marca o ponto pela primeira vez. */
const DEFAULT_RADIUS_KM = 3;

/** Zoom de rua, usado só enquanto não há círculo para enquadrar. */
const POINT_ZOOM = 16;

/**
 * Mapa da área de entrega: o ponto do restaurante e o raio a partir dele.
 *
 * O Leaflet entra por `import()` dentro do efeito porque ele mexe em `window`
 * na importação — no servidor o módulo nem chega a ser avaliado, e o painel só
 * baixa o mapa em quem abre esta aba.
 *
 * O que é gravado sai daqui em três campos escondidos (`latitude`, `longitude`
 * e `deliveryRadiusKm`), então o formulário continua sendo um formulário: o
 * mapa não salva nada sozinho, quem salva é o botão da aba.
 *
 * `address` é o que está digitado na aba neste instante, não o que está
 * gravado: os campos do endereço ficam logo acima do mapa, e procurar pelo
 * valor antigo levaria o pino para a rua que o lojista acabou de trocar.
 */
export function DeliveryRadiusMap({
  address,
  defaultRadiusKm,
  onPointChange,
}: {
  address: BusinessAddress;
  defaultRadiusKm: number;
  /** Chamado a cada mudança do ponto — inclusive na montagem. */
  onPointChange?: (point: Coordinates | null) => void;
}) {
  const locale = useLocale();
  const [point, setPoint] = useState<Coordinates | null>(() => addressPoint(address));
  const [radiusKm, setRadiusKm] = useState(() => clampRadius(defaultRadiusKm) || DEFAULT_RADIUS_KM);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  // O Leaflet chega por import assíncrono: até ele montar não há o que enquadrar.
  const [ready, setReady] = useState(false);

  // Quem cobra por km precisa saber, sem salvar, se ainda há de onde medir.
  useEffect(() => {
    onPointChange?.(point);
  }, [point, onPointChange]);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const circleRef = useRef<Leaflet.Circle | null>(null);

  const searchable = isSearchableAddress(address);

  /* ------------------------------------------------------------------ mapa */

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: Leaflet.Map | null = null;
    let cancelled = false;

    void (async () => {
      const L = await import('leaflet');
      if (cancelled || !containerRef.current) return;

      // Centro provisório: assim que o mapa existe, `frame()` o leva ao ponto
      // marcado (ou o deixa aqui, quando ainda não há ponto nenhum).
      const start = FALLBACK_CENTER;
      map = L.map(container, {
        center: [start.latitude, start.longitude],
        zoom: POINT_ZOOM,
        // A aba é longa: a roda do mouse rola a página, não dá zoom no mapa.
        // Os botões +/−, o duplo clique e a pinça continuam valendo.
        scrollWheelZoom: false,
      });
      mapRef.current = map;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        // Atribuição exigida pela licença do OpenStreetMap: não tire daqui.
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const token = (name: string, fallback: string) =>
        getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
      const brand = token('--color-primary', '#0b8639');
      const ink = token('--color-gray-700', '#3e3e3e');

      // O círculo é cinza e o pino é vermelho: a área é contexto, o ponto é o
      // que o lojista move. Duas cores fortes no mesmo desenho competiriam.
      circleRef.current = L.circle([start.latitude, start.longitude], {
        radius: 0,
        color: ink,
        weight: 1.5,
        opacity: 0.7,
        fillColor: ink,
        fillOpacity: 0.07,
      }).addTo(map);

      markerRef.current = L.marker([start.latitude, start.longitude], {
        draggable: true,
        keyboard: false,
        icon: L.divIcon({
          className: '',
          html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${brand};border:3px solid #fff;box-shadow:0 1px 3px rgb(0 0 0 / 0.3)"></span>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
      }).addTo(map);

      markerRef.current.on('dragend', () => {
        const next = markerRef.current?.getLatLng();
        if (!next) return;
        setPoint({ latitude: next.lat, longitude: next.lng });
        setMessage('');
      });

      map.on('click', (event: Leaflet.LeafletMouseEvent) => {
        setPoint({ latitude: event.latlng.lat, longitude: event.latlng.lng });
        setMessage('');
      });

      setReady(true);
    })();

    return () => {
      cancelled = true;
      setReady(false);
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // Monta uma vez: ponto e raio entram pelos efeitos de sincronismo abaixo.
  }, []);

  /* O mapa acompanha o que está no estado — venha de arrastar, clicar ou buscar. */
  const frame = useCallback(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    const circle = circleRef.current;
    if (!map || !marker || !circle) return;

    const center: [number, number] = point
      ? [point.latitude, point.longitude]
      : [FALLBACK_CENTER.latitude, FALLBACK_CENTER.longitude];

    marker.setLatLng(center);
    circle.setLatLng(center);
    circle.setRadius(point ? radiusKm * 1000 : 0);

    // Sem ponto marcado o pino sai do mapa: deixá-lo no centro faria parecer
    // que o restaurante já está ali.
    if (point) marker.addTo(map);
    else marker.remove();

    // Com a entrega desligada a aba esconde este bloco, e o mapa nasce com
    // altura zero. Ao reaparecer ele precisa ser avisado do tamanho novo,
    // senão fica cinza e com os tiles fora do lugar.
    map.invalidateSize({ animate: false });
    if (point) map.fitBounds(circle.getBounds(), { padding: [16, 16], animate: false });
    else map.setView(center, 12, { animate: false });
  }, [point, radiusKm]);

  useEffect(frame, [frame, ready]);

  /* O bloco aparece e some com a entrega: o mapa se reenquadra sozinho. */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => frame());
    observer.observe(container);
    return () => observer.disconnect();
  }, [frame]);

  /* --------------------------------------------------------------- endereço */

  const searchAddress = useCallback(async () => {
    setSearching(true);
    setMessage('');
    try {
      // Campos separados e, como reserva, o endereço inteiro: a busca por
      // texto livre erra a cidade quando o nome da rua existe em várias.
      const query = new URLSearchParams({
        rua: address.street,
        cidade: address.city,
        uf: address.state,
        cep: address.postalCode,
        endereco: addressQuery(address),
      });
      const response = await fetch(`/api/geocodificar?${query}`);
      const data = (await response.json()) as {
        latitude?: number;
        longitude?: number;
        label?: string;
        error?: string;
      };
      if (!response.ok) {
        setMessage(data.error ?? 'Não foi possível procurar o endereço agora.');
        return;
      }
      setPoint({ latitude: Number(data.latitude), longitude: Number(data.longitude) });
      // O endereço encontrado sai escrito: é assim que o lojista percebe que a
      // busca acertou outra rua de mesmo nome, em vez de descobrir na entrega.
      setMessage(
        data.label
          ? `Encontramos: ${data.label}. Arraste o pino se não for aqui.`
          : 'Ponto marcado pelo endereço. Confira e arraste o pino se precisar ajustar.',
      );
    } catch {
      setMessage('Não foi possível procurar o endereço agora. Arraste o pino até o restaurante.');
    } finally {
      setSearching(false);
    }
  }, [address]);

  return (
    <fieldset>
      <legend className="text-body2 font-semibold text-gray-700">Área de entrega</legend>
      <p className="mt-1 text-caption text-gray-600">
        Marque o restaurante no mapa e escolha até onde você entrega. Aparece no cardápio como
        referência para o cliente.
      </p>

      {/* O que a aba grava. Sem ponto marcado, os três voltam vazios e a área some. */}
      <input type="hidden" name="latitude" value={point ? point.latitude : ''} />
      <input type="hidden" name="longitude" value={point ? point.longitude : ''} />
      <input type="hidden" name="deliveryRadiusKm" value={point ? radiusKm.toFixed(1) : '0'} />

      <div className="mt-3 overflow-hidden rounded-md border border-gray-200">
        <div
          ref={containerRef}
          // O Leaflet precisa de altura no elemento: sem isto o mapa não aparece.
          className="mapa-entrega h-64 w-full bg-gray-100 sm:h-72"
          aria-label="Mapa da área de entrega. Clique no mapa ou arraste o pino para marcar o restaurante."
          role="img"
        />

        <div hidden={!point} className="border-t border-gray-200 bg-white px-4 pb-3 pt-2.5">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="deliveryRadius" className="text-body2 font-medium text-gray-700">
              Raio de entrega
            </label>
            <span className="text-body2 font-semibold text-gray-700">{formatRadius(radiusKm, locale)}</span>
          </div>
          <input
            id="deliveryRadius"
            type="range"
            min={MIN_RADIUS_KM}
            max={MAX_RADIUS_KM}
            step={RADIUS_STEP_KM}
            value={radiusKm}
            onChange={(event) => setRadiusKm(clampRadius(Number(event.target.value)))}
            className="mt-1.5 w-full accent-primary"
          />
          <div className="flex justify-between text-caption text-gray-600">
            <span>{formatRadius(MIN_RADIUS_KM, locale)}</span>
            <span>{formatRadius(MAX_RADIUS_KM, locale)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 bg-white p-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={searching}
            disabled={!searchable}
            onClick={() => void searchAddress()}
            leading={<Crosshair className="size-4" />}
          >
            {point ? 'Marcar pelo endereço' : 'Procurar meu endereço'}
          </Button>

          {point && (
            <button
              type="button"
              onClick={() => {
                setPoint(null);
                setMessage('');
              }}
              className="press flex items-center gap-2 text-body2 font-semibold text-gray-600 hover:text-primary"
            >
              <MapPinOff aria-hidden="true" className="size-4" />
              Remover do mapa
            </button>
          )}
        </div>
      </div>

      {!searchable && (
        <p className="mt-2 text-caption text-gray-600">
          Preencha rua e cidade no endereço acima para procurar sozinho — ou marque o ponto
          direto no mapa.
        </p>
      )}

      {/* Resumo em texto: é por ele que quem não vê o mapa acompanha o resultado. */}
      <p role="status" className={cn('mt-2 text-caption', message ? 'text-gray-700' : 'text-gray-600')}>
        {message
          || (point ? (
            <>
              <MapPin aria-hidden="true" className="mr-1 inline size-3.5 align-[-2px]" />
              Entregando em até {formatRadius(radiusKm, locale)} do ponto marcado.
            </>
          ) : (
            'Nenhum ponto marcado — o cardápio não vai mostrar área de entrega.'
          ))}
      </p>
    </fieldset>
  );
}
