export const REGULAR_EXPRESSIONS = {
  ["Name"]: /^\b(?!.*?\s{2})[A-Za-z ]{1,40}\b$/m,
  ["City"]: /^\b(?!.*?\s{2})[A-Za-z ]{1,20}\b$/m,
  ["State"]: /^[A-Z]{2}$/m,
  ["Phone"]: /^\+[0-9]{10,20}$/m,
  ["Address"]: /^\b(?!.*?\s{2})[A-Za-z0-9 ]{1,20}\b$/m,
  ["Street"]: /^\b(?!.*?\s{2})[A-Za-z0-9 ]{1,40}\b$/m,
  ["House"]: /^[0-9]{1,3}$/m,
  ["Apartment"]: /^[0-9]{1,4}$/m,
  ["ZipCode"]: /^\d{5}(-\d{4})?$/m,
  ["Email"]: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/m,
  ["Notes"]: /^[^<>]{0,250}$/m,
  ["Product Name"]: /^\b(?!.*?\s{2})[A-Za-z0-9 ]{3,40}\b$/m,
  ["Amount"]: /^[0-9]{1,3}$/m,
  ["Price"]: /^[0-9]{1,5}$/m,
};

export function isValidInput(inputName: string, value: string | number) {
  if (typeof value === "string") {
    return REGULAR_EXPRESSIONS[inputName].test(value.trim());
  } else {
    return REGULAR_EXPRESSIONS[inputName].test(value);
  }
}

export function isValidDate(date: string) {
  return !!Date.parse(date)
}
