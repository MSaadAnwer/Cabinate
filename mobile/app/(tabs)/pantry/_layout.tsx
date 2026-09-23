import { SectionStack } from "../../../src/components/section-stack";
export const unstable_settings = { initialRouteName: "index" };
export default function Layout() {
  return (
    <SectionStack
      title="Pantry"
      detail="inventory"
      detailTitle="Pantry items"
    />
  );
}
