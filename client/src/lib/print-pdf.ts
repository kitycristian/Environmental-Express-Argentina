export function printAsPDF(title: string = "Informe") {
  const prevTitle = document.title;
  document.title = title;
  window.print();
  document.title = prevTitle;
}
