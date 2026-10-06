import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

export type KitchenObject = "notepad" | "jar" | "board" | "pot";

export function KitchenNavigationArt({ object }: { object: KitchenObject }) {
  return <Svg width={128} height={96} viewBox="0 0 160 120" accessible={false}>
    <Ellipse cx={80} cy={109} rx={49} ry={5} fill="#324A3D" opacity={0.07} />
    <G stroke="#566451" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {object === "notepad" && <>
        <G rotation={-6} origin="80,60">
          <Rect x={39} y={12} width={76} height={94} rx={9} fill="#FFFEF7" />
          <Path d="M40 32h74" stroke="#DADDD0" />
          {[52, 69, 86].map(y => <G key={y}>
            <Rect x={51} y={y - 5} width={9} height={9} rx={2} fill="#E6EBD9" stroke="#A1AE90" />
            <Path d={`M68 ${y}h30`} stroke="#A1AE90" />
          </G>)}
          <Path d="M55 8v12M71 8v12M87 8v12M103 8v12M52 51l3 3 6-7" />
        </G>
        <G rotation={18} origin="124,65">
          <Rect x={121} y={27} width={9} height={63} rx={2} fill="#D9AC72" />
          <Path d="m121 90 4.5 12 4.5-12" fill="#EEDCC0" />
          <Path d="m124 99 1.5 3 1.5-3M121 36h9" />
        </G>
      </>}
      {object === "jar" && <>
        <Rect x={42} y={23} width={76} height={83} rx={14} fill="#DDE9DD" />
        <Path d="M43 69h74v22q0 14-13 14H56q-13 0-13-14Z" fill="#D5BC8D" stroke="none" />
        <Rect x={39} y={13} width={82} height={17} rx={5} fill="#9CAB83" />
        <Path d="M49 19h62" stroke="#D5DFC4" />
        <Path d="M51 40v18" stroke="#FFFEF7" strokeWidth={4} />
        <Rect x={55} y={51} width={50} height={29} rx={5} fill="#FFFEF7" stroke="#A1AE90" />
        <Path d="M80 72V59m0 8c-9 0-9-8-9-8 9 0 9 8 9 8Zm0-2c8 0 8-7 8-7-8 0-8 7-8 7Z" fill="#BCCD9A" />
      </>}
      {object === "board" && <>
        <Path d="M58 13h44q8 0 8 8v17h16q8 0 8 8v51q0 9-9 9H35q-9 0-9-9V46q0-8 8-8h16V21q0-8 8-8Z" fill="#D9B889" stroke="#9A7B55" />
        <Path d="M72 25h16" stroke="#9A7B55" strokeWidth={6} />
        <Path d="M35 51v42M124 51v42M42 99h69" stroke="#C29E70" />
        <G rotation={-8} origin="80,70">
          <Rect x={44} y={45} width={71} height={51} rx={4} fill="#FFFEF7" stroke="#A1AE90" />
          <Path d="M55 59h32M55 71h49M55 82h39" stroke="#A1AE90" />
          <Circle cx={102} cy={57} r={4} fill="#E6A59A" stroke="none" />
        </G>
      </>}
      {object === "pot" && <>
        <Path d="M63 29c-12-10 12-12 0-23M80 26c-12-10 12-12 0-23M97 29c-12-10 12-12 0-23" stroke="#A1AE90" />
        <Path d="M41 64H27v16h14M119 64h14v16h-14" fill="#9CAB83" />
        <Path d="M40 56h80v34q0 16-16 16H56q-16 0-16-16Z" fill="#BCCD9A" />
        <Path d="M39 57q0-12 13-12h56q13 0 13 12Z" fill="#D5DFC4" />
        <Rect x={71} y={36} width={18} height={9} rx={4} fill="#566D43" />
        <Path d="M52 69v18q0 7 7 7" stroke="#E6EBD9" strokeWidth={4} />
      </>}
    </G>
  </Svg>;
}
