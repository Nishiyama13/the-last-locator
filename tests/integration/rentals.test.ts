import supertest from "supertest";
import app from "../../src/app";
import { cleanDb } from "../utils";
import { buildUser } from "../factories/user-factory";
import { buildMovie } from "../factories/movie-factory";
import { buildRental, rentMovie } from "../factories/rentals-factory";
import { RentalFinishInput, RentalInput } from "../../src/protocols";

const api = supertest(app);

beforeEach( async () => {
  await cleanDb();
})

describe("GET /rentals", () => {
  it("should return all rentals", async () => {
    const user = await buildUser();
    const movie = await buildMovie();
    const rental = await buildRental(user.id);
    await rentMovie(rental.id, movie.id);

    const { status, body } = await api.get("/rentals");
    expect(status).toBe(200);
    expect(body).toEqual([{
      id: rental.id,
      date: expect.any(String),
      endDate: expect.any(String),
      userId: user.id,
      closed: false
    }]);
  });
})

describe("GET /rentals/:id", () => {
  it("should return all rentals", async () => {
    const user = await buildUser();
    const movie = await buildMovie();
    const rental = await buildRental(user.id);
    await rentMovie(rental.id, movie.id);

    const { status, body } = await api.get(`/rentals/${rental.id}`);
    expect(status).toBe(200);
    expect(body).toEqual({
      id: rental.id,
      date: expect.any(String),
      endDate: expect.any(String),
      userId: user.id,
      closed: false
    });
  });

  it("should return 400 when id is invalid", async () => {
    const { status } = await api.get(`/rentals/invalid`);
    expect(status).toBe(400);
  });

  it("should return 404 when rental does not exist", async () => {
    const { status } = await api.get(`/rentals/1`);
    expect(status).toBe(404);
  });

});

describe("POST /rentals", () => {
  it("should return all rentals", async () => {
    const user = await buildUser();
    const movie = await buildMovie();
    const rental: RentalInput = {
      userId: user.id,
      moviesId: [movie.id]
    } 
    
    const { status } = (await api.post(`/rentals`).send(rental));
    expect(status).toBe(201);
  });

  it("should return 422 when data is missing", async () => {
    type RentalInputMissingData = Omit<RentalInput, "moviesId">;
    const rentalMissing : RentalInputMissingData = {
      userId: 1
    }
    /*const user = await buildUser();
    const movie = await buildMovie();
    const rentalMissing: RentalInputMissingData = {
      userId: user.id
    } */

    const { status } = await api.post(`/rentals`).send(rentalMissing);
    expect(status).toBe(422);
  });

  it("should return 404 when id user does not exist", async () => {
    //const user = await buildUser(); //não criar user
    const movie = await buildMovie();
    const rental: RentalInput = {
      userId: 1,                      //tenta puxar o id do user que não existe
      moviesId: [movie.id]
    } 
    const { status } = await api.post(`/rentals`).send(rental);
    expect(status).toBe(404);
  });

  it("should return 401 when movie does not exist", async () => {
    const user = await buildUser(); 
    //const movie = await buildMovie();     //não criar movie
    const rental: RentalInput = {
      userId: user.id,                      
      moviesId: [1]                         //tenta puxar o id do movie que não existe
    } 
    const { status } = await api.post(`/rentals`).send(rental);
    expect(status).toBe(404);
  });
  
  it("should return 401 when a minor tries to rental a movie that is adult only", async () => {
    const user = await buildUser(false);    //criança
    const movie = await buildMovie(true);   //filme para adulto
    const rental: RentalInput = {
      userId: user.id,
      moviesId: [movie.id]
    } 
    
    const { status } = (await api.post(`/rentals`).send(rental));
    expect(status).toBe(401);
  });

  it("should return 409 when user tries to rent a movie that is already in another rental", async () => {
    const user = await buildUser();    
    const movie = await buildMovie();   
    const rental = await buildRental(user.id) 
    await rentMovie(rental.id, movie.id);     //user1 rental movie

    const user2 = await buildUser();          //cria um novo usuario para tentar alugar o filme já alugado
    const rentalAtemp : RentalInput = {
      userId:user2.id,
      moviesId: [movie.id]
    }

    const { status } = (await api.post(`/rentals`).send(rentalAtemp)); 
    expect(status).toBe(409);
  });

  it("should return 402 when user already have a rental to return", async () => {
    const user = await buildUser();    
    const movie = await buildMovie();   
    const rental = await buildRental(user.id) 
    await rentMovie(rental.id, movie.id);     

    const movie2 = await buildMovie();          //cria um novo filme para tentar alugar
    const rentalAtemp : RentalInput = {
      userId:user.id,
      moviesId: [movie2.id]
    };

    const { status } = (await api.post(`/rentals`).send(rentalAtemp)); 
    expect(status).toBe(402);
  });

});

describe("POST /rentals/finish", () => {
  it("should return 422 when data is missing", async () => {
    const { status } = (await api.post(`/rentals/finish`).send({}));
    expect(status).toBe(422);
  });

  it("should finalize a valid rentals", async () => {
    const user = await buildUser();
    const movie1 = await buildMovie();
    const movie2 = await buildMovie();
    const rental = await buildRental(user.id);

    await rentMovie(rental.id, movie1.id);
    await rentMovie(rental.id, movie2.id);
    
    const data: RentalFinishInput = {
      rentalId: rental.id
    };

    const { status } = (await api.post(`/rentals/finish`).send(data));
    expect(status).toBe(200);
  });

  it("should return 404 when rental does not exist", async () => {
    const data: RentalFinishInput = {
      rentalId: 1
    };

    const { status } = (await api.post(`/rentals/finish`).send(data));
    expect(status).toBe(404);
  });

});