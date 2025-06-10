import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configureer __dirname voor ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function readData(filePath) {
    try {
        const data = await fs.readFile(path.join(process.cwd(), filePath), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Bestand bestaat niet, retourneer lege array
            return [];
        }
        console.error(`Fout bij het lezen van ${filePath}:`, error);
        throw error;
    }
}

export async function writeData(filePath, data) {
    try {
        await fs.mkdir(path.dirname(path.join(process.cwd(), filePath)), { recursive: true });
        await fs.writeFile(
            path.join(process.cwd(), filePath), 
            JSON.stringify(data, null, 2), 
            'utf8'
        );
    } catch (error) {
        console.error(`Fout bij het schrijven naar ${filePath}:`, error);
        throw error;
    }
}
