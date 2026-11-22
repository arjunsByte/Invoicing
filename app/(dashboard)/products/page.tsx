import { getProductsServices } from "@/lib/db/data-store";
import { ProductsView } from "@/components/products/products-view";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getProductsServices();
  return <ProductsView initialProducts={products} />;
}
