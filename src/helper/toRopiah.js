async function rupiah(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "Rp0";
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}
export {
  rupiah
};
