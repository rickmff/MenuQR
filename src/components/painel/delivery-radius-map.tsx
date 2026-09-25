'use client';

import 'leaflet/dist/leaflet.css';
import './delivery-radius-map.css';
import type * as Leaflet from 'leaflet';
import { Crosshair, MapPin, MapPinOff } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
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

/** Dedo como ponteiro principal: celular e tablet. */
const COARSE_POINTER = '(pointer: coarse)';

function subscribeCoarse(onChange: () => void) {
  const query = window.matchMedia(COARSE_POINTER);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** Área de toque do pino. O desenho continua com 16px; o resto é borda invisível. */
const PIN_HIT = 44;

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
 *
 * No celular o mapa não segura a rolagem: um dedo rola a página (a aba tem
 * várias telas) e mexer no mapa pede dois dedos. O pino continua arrastável
 * com um dedo, e o toque no mapa continua marcando o ponto — mas o status diz
 * que ele foi marcado à mão, porque um toque de passagem também marca.
 */
export function DeliveryRadiusMap({
  address,
  defaultRadiusKm,
  onPointChange,
  required = false,
  legendHidden = false,
}: {
  address: BusinessAddress;
  defaultRadiusKm: number;
  /** Chamado a cada mudança do ponto — inclusive na montagem. */
  onPointChange?: (point: Coordinates | null) => void;
  /** Cobrando por distância o ponto é obrigatório: o rótulo leva o "*" e a dica muda. */
  required?: boolean;
  /** Quem embrulha o mapa já dá o nome dele na tela (o `<summary>` da aba): a legenda fica só para leitor de tela. */
  legendHidden?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations('painel.map');
  const tField = useTranslations('ui.textField');
  const [point, setPoint] = useState<Coordinates | null>(() => addressPoint(address));
  const [radiusKm, setRadiusKm] = useState(() => clampRadius(defaultRadiusKm) || DEFAULT_RADIUS_KM);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  // O ponto veio de um toque no mapa, não da busca pelo endereço.
  const [byHand, setByHand] = useState(false);
  const coarse = useSyncExternalStore(
    subscribeCoarse,
    () => window.matchMedia(COARSE_POINTER).matches,
    () => false,
  );
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
        // No celular, arrastar com um dedo rola a página (ver o efeito de
        // `coarse`, abaixo): sem isto o mapa prendia a rolagem da aba.
        dragging: !window.matchMedia(COARSE_POINTER).matches,
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
        // O desenho tem 16px, mas o alvo tem 44: com o dedo, 16px não se pega.
        // `mapa-entrega-pino` tira o gesto do navegador de cima do pino (CSS).
        icon: L.divIcon({
          className: 'mapa-entrega-pino',
          html: `<span style="display:grid;place-items:center;width:${PIN_HIT}px;height:${PIN_HIT}px"><span style="display:block;width:16px;height:16px;border-radius:9999px;background:${brand};border:3px solid #fff;box-shadow:0 1px 3px rgb(0 0 0 / 0.3)"></span></span>`,
          iconSize: [PIN_HIT, PIN_HIT],
          iconAnchor: [PIN_HIT / 2, PIN_HIT / 2],
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
        setByHand(true);
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

  /* Trocou o ponteiro (tablet com teclado, janela do DevTools): o arrasto acompanha. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (coarse) map.dragging.disable();
    else map.dragging.enable();
  }, [coarse, ready]);

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
        setMessage(data.error ?? t('searchFailed'));
        return;
      }
      setPoint({ latitude: Number(data.latitude), longitude: Number(data.longitude) });
      setByHand(false);
      // O endereço encontrado sai escrito: é assim que o lojista percebe que a
      // busca acertou outra rua de mesmo nome, em vez de descobrir na entrega.
      setMessage(data.label ? t('found', { label: data.label }) : t('foundNoLabel'));
    } catch {
      setMessage(t('searchFailedDrag'));
    } finally {
      setSearching(false);
    }
  }, [address, t]);

  return (
    <fieldset>
      <legend className={legendHidden ? 'sr-only' : 'text-body2 font-semibold text-gray-700'}>
        {t('legend')}
        {required && (
          <>
            <span aria-hidden="true" className="text-gray-600">
              {' '}
              *
            </span>
            <span className="sr-only"> {tField('required')}</span>
          </>
        )}
      </legend>
      <p className={cn('text-caption text-gray-600', !legendHidden && 'mt-1')}>
        {required ? t('hintRequired') : t('hint')}
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
          aria-label={t('mapLabel')}
          role="img"
        />

        <div hidden={!point} className="border-t border-gray-200 bg-white px-4 pb-3 pt-2.5">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="deliveryRadius" className="text-body2 font-medium text-gray-700">
              {t('radius')}
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
            {point ? t('markByAddress') : t('findAddress')}
          </Button>

          {point && (
            <button
              type="button"
              onClick={() => {
                setPoint(null);
                setMessage('');
                setByHand(false);
              }}
              className="press flex items-center gap-2 text-body2 font-semibold text-gray-600 hover:text-primary"
            >
              <MapPinOff aria-hidden="true" className="size-4" />
              {t('removePoint')}
            </button>
          )}
        </div>
      </div>

      {coarse && <p className="mt-2 text-caption text-gray-600">{t('twoFingers')}</p>}

      {!searchable && (
        <p className="mt-2 text-caption text-gray-600">{t('needAddress')}</p>
      )}

      {/*
       * Resumo em texto: é por ele que quem não vê o mapa acompanha o resultado.
       * O aviso do ponto marcado à mão vem antes do raio, não no lugar dele —
       * senão mexer no raio depois de marcar deixava o leitor de tela sem o
       * "Entregando em até…".
       */}
      <p role="status" className={cn('mt-2 text-caption', message ? 'text-gray-700' : 'text-gray-600')}>
        {message
          || (point ? (
            <>
              <MapPin aria-hidden="true" className="mr-1 inline size-3.5 align-[-2px]" />
              {byHand && <>{t('markedByHand')} </>}
              {t('delivering', { radius: formatRadius(radiusKm, locale) })}
            </>
          ) : (
            t('noPoint')
          ))}
      </p>
    </fieldset>
  );
}
