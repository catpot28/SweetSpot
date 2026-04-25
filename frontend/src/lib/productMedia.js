export function selectProductImage(product = {}) {
  return (
    product.product_image_url ||
    product.productImageUrl ||
    product.thumbnail_url ||
    product.thumbnailUrl ||
    product.thumbnail ||
    null
  );
}
