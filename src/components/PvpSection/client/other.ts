export const SUPPORTED_TOKENS = {
  STABLEAI: "0x07F41412697D14981e770b6E335051b1231A2bA8",
  DIG: "0x208561379990f106E6cD59dDc14dFB1F290016aF",
  WEB9: "0x09CA293757C6ce06df17B96fbcD9c5f767f4b2E1",
  BNKR: "0x22aF33FE49fD1Fa80c7149773dDe5890D3c76F3b",
  FED: "0x19975a01B71D4674325bd315E278710bc36D8e5f",
  RaTcHeT: "0x1d35741c51fb615ca70e28d3321f6f01e8d8a12d",
  GIRTH: "0xa97d71a5fdf906034d9d121ed389665427917ee4",
};

export const weiToEther = (wei: string): string => {
  const weiValue = BigInt(wei);
  const etherValue = Number(weiValue) / 1e18;
  return etherValue.toFixed(0);
};

export const formatAddress = (address: string): string => {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

export const getRankEmoji = (index: number): string | number => {
  switch (index) {
    case 0:
      return "🏆";
    case 1:
      return "🥈";
    case 2:
      return "🥉";
    default:
      return index + 1;
  }
};