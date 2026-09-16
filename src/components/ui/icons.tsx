import type { SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function CartIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M5.588 21.413Q5 20.825 5 20t.588-1.412T7 18t1.413.588T9 20t-.587 1.413T7 22t-1.412-.587m10 0Q15 20.825 15 20t.588-1.412T17 18t1.413.588T19 20t-.587 1.413T17 22t-1.412-.587M5.2 4h14.75q.575 0 .875.513t.025 1.037l-3.55 6.4q-.275.5-.737.775T15.55 13H8.1L7 15h12v2H7q-1.125 0-1.7-.987t-.05-1.963L6.6 11.6L3 4H1V2h3.25z"/>
    </svg>
  );
}

export function LockIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M6 22q-.825 0-1.412-.587T4 20V10q0-.825.588-1.412T6 8h1V6q0-2.075 1.463-3.537T12 1t3.538 1.463T17 6v2h1q.825 0 1.413.588T20 10v10q0 .825-.587 1.413T18 22zm7.413-5.587Q14 15.825 14 15t-.587-1.412T12 13t-1.412.588T10 15t.588 1.413T12 17t1.413-.587M9 8h6V6q0-1.25-.875-2.125T12 3t-2.125.875T9 6z"/>
    </svg>
  );
}

export function ChartIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 512 512" {...props}>
      <path fill="currentColor" fillRule="evenodd" d="M64 64h64v298.667H64zm106.667 149.333h64v149.334h-64zM448 170.667h-64v192h64zm-170.667-64h64v256h-64zM448 405.333H64V448h384z" clipRule="evenodd"/>
    </svg>
  );
}

export function CheckIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="m9.55 18l-5.7-5.7l1.425-1.425L9.55 15.15l9.175-9.175L20.15 7.4z"/>
    </svg>
  );
}

export function ChevronDownIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6l-6-6z"/>
    </svg>
  );
}

export function ChevronRightIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M12.6 12L8 7.4L9.4 6l6 6l-6 6L8 16.6z"/>
    </svg>
  );
}

export function ClockIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 50 50" {...props}>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path stroke="#344054" d="M25 14.583V25h-8.333"/><path stroke="#306CFE" d="M41.667 6.25H8.333c-1.15 0-2.083.933-2.083 2.083v33.334c0 1.15.933 2.083 2.083 2.083h33.334c1.15 0 2.083-.933 2.083-2.083V8.333c0-1.15-.933-2.083-2.083-2.083"/></g>
    </svg>
  );
}

export function CloseIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M6 6l12 12M18 6L6 18"/>
    </svg>
  );
}

export function CoffeeIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"><path strokeWidth="5.5" d="M4 7v9h11V7" opacity=".2"/><path strokeWidth="5.5" d="M15 7a3 3 0 0 1 0 6" opacity=".2"/><path strokeWidth="5.5" d="M2 19h15" opacity=".2"/><path d="M4 7v9h11V7"/><path d="M15 7a3 3 0 0 1 0 6"/><path d="M2 19h15"/></g>
    </svg>
  );
}

export function CreditCardIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <g fill="none"><path d="M22 10v10H2V10zm0-6H2v6h20z"/><path stroke="currentColor" strokeLinecap="square" strokeWidth="2" d="M22 4H2m20 0v16H2V4m20 0v6H2V4m7 11H6"/></g>
    </svg>
  );
}

export function EditIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m14.363 5.652l1.48-1.48a2 2 0 0 1 2.829 0l1.414 1.414a2 2 0 0 1 0 2.828l-1.48 1.48m-4.243-4.242l-9.616 9.615a2 2 0 0 0-.578 1.238l-.242 2.74a1 1 0 0 0 1.084 1.085l2.74-.242a2 2 0 0 0 1.24-.578l9.615-9.616m-4.243-4.242l4.243 4.242"/>
    </svg>
  );
}

export function GoogleIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 512 512" {...props}>
      <path fill="currentColor" d="m473.16 221.48l-2.26-9.59H262.46v88.22H387c-12.93 61.4-72.93 93.72-121.94 93.72c-35.66 0-73.25-15-98.13-39.11a140.08 140.08 0 0 1-41.8-98.88c0-37.16 16.7-74.33 41-98.78s61-38.13 97.49-38.13c41.79 0 71.74 22.19 82.94 32.31l62.69-62.36C390.86 72.72 340.34 32 261.6 32c-60.75 0-119 23.27-161.58 65.71C58 139.5 36.25 199.93 36.25 256s20.58 113.48 61.3 155.6c43.51 44.92 105.13 68.4 168.58 68.4c57.73 0 112.45-22.62 151.45-63.66c38.34-40.4 58.17-96.3 58.17-154.9c0-24.67-2.48-39.32-2.59-39.96"/>
    </svg>
  );
}

export function GridIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zm10 0a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zM4 15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zm10 0a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"/>
    </svg>
  );
}

export function HelpIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <g fill="currentColor" fillRule="evenodd" clipRule="evenodd"><path d="M12.297 17.32a.85.85 0 0 0-1.37.47c-.44 1 1.22 1.63 1.64.83c.32-.63.28-1.03-.27-1.3"/><path d="M21.29 4.618c-3.631-4.63-9.043-4.3-11.923-3.56a11.5 11.5 0 0 0-4.151 2a15.6 15.6 0 0 0-2.48 2.31A11.5 11.5 0 0 0 .914 8.31a10.15 10.15 0 0 0 3 12.223a13 13 0 0 0 12.733 2a12 12 0 0 0 5.072-3.92A10.74 10.74 0 0 0 24 12.61a13.22 13.22 0 0 0-2.71-7.992m-.46 13.283a10.9 10.9 0 0 1-4.602 3.47a11.88 11.88 0 0 1-11.522-1.8A9.12 9.12 0 0 1 1.846 8.68c.393-.973.932-1.88 1.6-2.69a14.8 14.8 0 0 1 2.29-2.281a10.8 10.8 0 0 1 3.83-1.93c1.671-.47 7.342-1.52 11.003 3.38a12.14 12.14 0 0 1 2.45 7.422a9.8 9.8 0 0 1-2.19 5.321"/><path d="M12.718 5.338a3.5 3.5 0 0 0-3.231.72a3.17 3.17 0 0 0-.89 1.53a4.83 4.83 0 0 0 .05 2.451a.323.323 0 0 0 .63-.14a4.5 4.5 0 0 1 0-1.75a2.25 2.25 0 0 1 .82-1.34a2.48 2.48 0 0 1 2.27-.31a2.61 2.61 0 0 1 1.74 1.49a1.69 1.69 0 0 1-.09 1.67c-.62.91-1.76 1.63-2.38 2.61a2.8 2.8 0 0 0-.45 1.581a4 4 0 0 0 .28 1.52a.37.37 0 0 0 .681.057a.38.38 0 0 0 .03-.287a3.7 3.7 0 0 1-.16-1.26a2.1 2.1 0 0 1 .4-1.08a11.6 11.6 0 0 1 1.74-1.61a4.15 4.15 0 0 0 1.19-1.48a2.84 2.84 0 0 0 0-2.181a3.74 3.74 0 0 0-2.63-2.19"/></g>
    </svg>
  );
}

export function HomeIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M4 21V9l8-6l8 6v12h-6v-7h-4v7z"/>
    </svg>
  );
}

export function ImageIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 14 14" {...props}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="m13.5 8.5l-4.71 4.71l-2.13.29l.3-2.13l4.7-4.71zm-9.219 5H1.8a1.3 1.3 0 0 1-1.3-1.3V1.8A1.3 1.3 0 0 1 1.8.5h10.4a1.3 1.3 0 0 1 1.3 1.3v2.95"/><path d="M9.014 4.795a1.25 1.25 0 1 0 0-2.5a1.25 1.25 0 0 0 0 2.5M.5 7.164a10.3 10.3 0 0 1 6.5.961"/></g>
    </svg>
  );
}

export function ListIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M7 9V7h14v2zm0 4v-2h14v2zm0 4v-2h14v2zM4 9q-.425 0-.712-.288T3 8t.288-.712T4 7t.713.288T5 8t-.288.713T4 9m0 4q-.425 0-.712-.288T3 12t.288-.712T4 11t.713.288T5 12t-.288.713T4 13m0 4q-.425 0-.712-.288T3 16t.288-.712T4 15t.713.288T5 16t-.288.713T4 17"/>
    </svg>
  );
}

export function LogoutIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 14 14" {...props}>
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M9.5 10.5v2a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v2M6.5 7h7m-2-2l2 2l-2 2"/>
    </svg>
  );
}

export function MapPinIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 48 48" {...props}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"><path d="M42 21c0 12.919-13.35 22.128-17.056 24.436a1.77 1.77 0 0 1-1.888 0C19.351 43.128 6 33.919 6 21c0-9.941 8.059-18 18-18s18 8.059 18 18"/><path d="M22.224 11.423c.747-1.439 2.805-1.439 3.551 0l2.156 4.155l4.613.909c1.523.3 2.139 2.145 1.1 3.3L30.36 23.44l.6 4.861c.195 1.584-1.45 2.747-2.878 2.035L24 28.298l-4.082 2.038c-1.427.712-3.073-.451-2.878-2.035l.6-4.861l-3.285-3.654c-1.038-1.154-.422-3 1.1-3.3l4.614-.908z"/></g>
    </svg>
  );
}

export function MenuIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/>
    </svg>
  );
}

export function MinusIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 14 14" {...props}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M10.25 13.5a3.25 3.25 0 1 0 0-6.5a3.25 3.25 0 0 0 0 6.5M9 10.25h2.5M6 4.74c3.038 0 5.5-.95 5.5-2.12S9.038.5 6 .5S.5 1.45.5 2.62S2.962 4.74 6 4.74m5.5-.24V2.62"/><path d="M.5 2.62v6.76c0 .93 1.54 1.71 3.69 2"/><path d="M4.49 8C2.19 7.78.5 7 .5 6"/></g>
    </svg>
  );
}

export function PhoneIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24c1.12.37 2.33.57 3.57.57c.55 0 1 .45 1 1V20c0 .55-.45 1-1 1c-9.39 0-17-7.61-17-17c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1c0 1.25.2 2.45.57 3.57c.11.35.03.74-.25 1.02z"/>
    </svg>
  );
}

export function PlusIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 12h6m0 0h6m-6 0v6m0-6V6"/>
    </svg>
  );
}

export function PrinterIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M18 3H6v4h12m1 5a1 1 0 0 1-1-1a1 1 0 0 1 1-1a1 1 0 0 1 1 1a1 1 0 0 1-1 1m-3 7H8v-5h8m3-6H5a3 3 0 0 0-3 3v6h4v4h12v-4h4v-6a3 3 0 0 0-3-3"/>
    </svg>
  );
}

export function ReceiptIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M3 22V2l1.5 1.5L6 2l1.5 1.5L9 2l1.5 1.5L12 2l1.5 1.5L15 2l1.5 1.5L18 2l1.5 1.5L21 2v20l-1.5-1.5L18 22l-1.5-1.5L15 22l-1.5-1.5L12 22l-1.5-1.5L9 22l-1.5-1.5L6 22l-1.5-1.5zm3-5h12v-2H6zm0-4h12v-2H6zm0-4h12V7H6z"/>
    </svg>
  );
}

export function SettingsIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6m0 4.5a1.5 1.5 0 1 1 .001-3.001A1.5 1.5 0 0 1 12 13.5m9.848 1.072l-1.93-1.63a1.232 1.232 0 0 1 0-1.884l1.93-1.63a.62.62 0 0 0 .189-.662a10.5 10.5 0 0 0-2.209-3.804a.62.62 0 0 0-.668-.168l-2.381.848a1.3 1.3 0 0 1-.419.073a1.24 1.24 0 0 1-1.219-1.014l-.454-2.478a.62.62 0 0 0-.482-.493a10.7 10.7 0 0 0-4.408 0a.62.62 0 0 0-.482.493l-.453 2.478a1.24 1.24 0 0 1-1.638.942l-2.38-.848a.62.62 0 0 0-.669.168a10.5 10.5 0 0 0-2.21 3.805a.615.615 0 0 0 .189.661l1.929 1.63q.077.066.143.143c.444.52.379 1.299-.143 1.742l-1.929 1.63a.62.62 0 0 0-.189.662a10.5 10.5 0 0 0 2.21 3.803a.62.62 0 0 0 .669.168l2.38-.847a1.3 1.3 0 0 1 .419-.072c.588 0 1.11.417 1.219 1.014l.453 2.478a.62.62 0 0 0 .482.493a10.7 10.7 0 0 0 4.408 0a.62.62 0 0 0 .482-.493l.454-2.478q.018-.099.053-.194a1.24 1.24 0 0 1 1.585-.748l2.379.848q.105.036.208.036a.62.62 0 0 0 .461-.204a10.5 10.5 0 0 0 2.208-3.804a.615.615 0 0 0-.189-.662zm-2.756 3.017l-1.81-.645a2.747 2.747 0 0 0-3.615 2.085l-.345 1.877a9.2 9.2 0 0 1-2.642-.002l-.344-1.876a2.737 2.737 0 0 0-3.616-2.085l-1.81.644a8.9 8.9 0 0 1-1.319-2.266l1.461-1.235c.56-.472.9-1.135.96-1.864a2.7 2.7 0 0 0-.645-1.995a3 3 0 0 0-.315-.315L3.591 8.677A8.9 8.9 0 0 1 4.91 6.412l1.81.645q.447.158.921.159a2.75 2.75 0 0 0 2.695-2.244l.344-1.876a9.3 9.3 0 0 1 2.642-.002l.343 1.877a2.737 2.737 0 0 0 3.617 2.085l1.81-.645c.552.69.993 1.449 1.319 2.266l-1.46 1.235a2.7 2.7 0 0 0-.96 1.864a2.71 2.71 0 0 0 .962 2.31l1.46 1.234a8.9 8.9 0 0 1-1.318 2.267z"/>
    </svg>
  );
}

export function StoreIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M4 6V4h16v2zm0 14v-6H3v-2l1-5h16l1 5v2h-1v6h-2v-6h-4v6zm2-2h6v-4H6z"/>
    </svg>
  );
}

export function TrashIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1M6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z"/>
    </svg>
  );
}

export function UsersIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <g fill="none"><path d="M16 8a4 4 0 1 1-8 0a4 4 0 0 1 8 0M5 19a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2H5z"/><path stroke="currentColor" strokeLinecap="square" strokeWidth="2" d="M16 8a4 4 0 1 1-8 0a4 4 0 0 1 8 0ZM5 19a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2H5zM7 4a4 4 0 1 0 0 8a6 6 0 0 0-6 6v3m22 0v-3a6 6 0 0 0-6-6a4 4 0 0 0 0-8"/></g>
    </svg>
  );
}

export function UtensilsIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4"/>
    </svg>
  );
}

export function WalletIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M6 20q-1.65 0-2.825-1.175T2 16V8q0-1.65 1.175-2.825T6 4h12q1.65 0 2.825 1.175T22 8v8q0 1.65-1.175 2.825T18 20zM6 8h12q.55 0 1.05.125t.95.4V8q0-.825-.587-1.412T18 6H6q-.825 0-1.412.588T4 8v.525q.45-.275.95-.4T6 8m-1.85 3.25l11.125 2.7q.225.05.45 0t.425-.2l3.475-2.9q-.275-.375-.7-.612T18 10H6q-.65 0-1.137.338t-.713.912"/>
    </svg>
  );
}

