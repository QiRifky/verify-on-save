import { SplitDemo } from "@/components/demo/SplitDemo";
import { ProductShelf } from "@/components/ui/skincare-product-shelf";
import { BugsProvider } from "@/lib/bugs";
import { SPLIT_MODE } from "@/lib/mode";

export default function ProductShelfDemo() {
  // Bug flags work in both modes; only the panel UI is limited to split mode.
  return <BugsProvider>{SPLIT_MODE ? <SplitDemo /> : <ProductShelf />}</BugsProvider>;
}
