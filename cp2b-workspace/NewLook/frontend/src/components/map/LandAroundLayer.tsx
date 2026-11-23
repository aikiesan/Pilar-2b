'use client';

/**
 * Land around, on the map: catches the click that places the circle, and draws
 * a dashed ink circle at the radius with a light veil over everything outside it.
 *
 * The map renders on canvas (preferCanvas), where paths take no CSS class and no
 * animation. These two draw as SVG in a pane of their own, between the
 * infrastructure (450) and the selected municipality's outline (460), and never
 * catch the pointer, so the click reaches the map underneath.
 */
import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { Circle, Polygon, useMap, useMapEvents } from 'react-leaflet';
import { circleRing, type LandAroundPoint } from '@/lib/landAround';

const PANE = 'land-around';

/** The world, as the veil's outer ring; the circle is its hole. */
const WORLD: [number, number][] = [[-85, -540], [85, -540], [85, 540], [-85, 540]];

interface LandAroundLayerProps {
  /** The tool is on: the cursor is a crosshair and a click places the circle. */
  active: boolean;
  /** The circle to draw; null draws nothing. */
  point: LandAroundPoint | null;
  radiusKm: number;
  onPick: (point: LandAroundPoint) => void;
}

export default function LandAroundLayer({ active, point, radiusKm, onPick }: LandAroundLayerProps) {
  const map = useMap();

  // Made during render, so it exists before the paths below add themselves to it.
  const renderer = useMemo(() => {
    if (!map.getPane(PANE)) {
      const pane = map.createPane(PANE);
      pane.style.zIndex = '455';
      pane.style.pointerEvents = 'none';
    }
    return L.svg({ pane: PANE });
  }, [map]);

  useEffect(() => {
    const container = map.getContainer();
    container.classList.toggle('land-around-on', active);
    return () => container.classList.remove('land-around-on');
  }, [map, active]);

  useMapEvents({
    click(e) {
      if (active) onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  const hole = useMemo(
    () => (point ? circleRing(point.lat, point.lng, radiusKm) : null),
    [point, radiusKm],
  );

  if (!point || !hole) return null;
  // Keyed on the circle, so a new point or radius fades in afresh.
  const key = `${point.lat},${point.lng},${radiusKm}`;
  return (
    <>
      <Polygon
        key={`veil-${key}`}
        positions={[WORLD, hole]}
        pane={PANE}
        renderer={renderer}
        interactive={false}
        stroke={false}
        className="land-around-veil"
      />
      <Circle
        key={`ring-${key}`}
        center={[point.lat, point.lng]}
        radius={radiusKm * 1000}
        pane={PANE}
        renderer={renderer}
        interactive={false}
        fill={false}
        weight={2}
        dashArray="8 6"
        className="land-around-ring"
      />
    </>
  );
}
