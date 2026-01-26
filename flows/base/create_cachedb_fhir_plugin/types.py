from pydantic import BaseModel

class CreateDuckdbDatabaseFileType(BaseModel):
    databaseCode: str
    schemaName: str
    cacheSchemaName: str
    fhirProjectId: str

    @property
    def sourceDatabase(self) -> str:
        return f"{self.databaseCode}__srcdb"