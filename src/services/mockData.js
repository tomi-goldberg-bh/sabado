const firstNames = ["Juan", "Maria", "Pedro", "Lucia", "Carlos", "Ana", "Miguel", "Sofia", "Diego", "Valentina", "Matias", "Camila", "Nicolas", "Martina", "Lucas", "Florencia", "Facundo", "Micaela", "Joaquin", "Agustina"];
const lastNames = ["Gonzalez", "Rodriguez", "Gomez", "Fernandez", "Lopez", "Diaz", "Martinez", "Perez", "Garcia", "Sanchez", "Romero", "Sosa", "Alvarez", "Torres", "Ruiz", "Ramirez", "Flores", "Benitez", "Acosta", "Medina"];

export const getMockSocios = () => {
  const socios = [];
  let id = 1;
  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 20; j++) {
      socios.push({
        id: id++,
        name: `${firstNames[i]} ${lastNames[j]}`
      });
    }
  }
  // Shuffle array a bit
  return socios.sort(() => Math.random() - 0.5);
};

export const MOCK_SOCIOS = getMockSocios();

export const MOCK_NOSOCIOS = [
  { id: 1001, name: "Lucas M" },
  { id: 1002, name: "Fernanda G" },
  { id: 1003, name: "Marcos T" },
  { id: 1004, name: "Luciana R" },
  { id: 1005, name: "Pepe H" }
];
