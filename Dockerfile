# Imagen base
FROM node:20

# Directorio de trabajo en el contenedor
WORKDIR /api

# Copiamos el packega y el package-lock.json
COPY package*.json ./

# Instalamos las dependencias necesarias
RUN npm install

# Copiar el resto de nuestra API
COPY . .

# Purto donde estará nuestro contenedor
EXPOSE 6000

# Comando para ejecutar la API
CMD [ "node", "server.js" ]