import rentalsService from "../../src/services/rentals-service";
import rentalsRepository from "../../src/repositories/rentals-repository";
import { Movie, Rental, User } from "@prisma/client";
import { notFoundError } from "../../src/errors/notfound-error";
import { buildUserInput } from "../factories/user-factory";
import { buildRentalReturn } from "../factories/rentals-factory";
import usersRepository from "../../src/repositories/users-repository";
import { buildMovieInput } from "../factories/movie-factory";
import moviesRepository from "../../src/repositories/movies-repository";

describe("Rentals Service Unit Tests", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  })

  describe("Get rentals tests", () => {
    it("should return rentals", async () => {
      jest.spyOn(rentalsRepository, "getRentals").mockResolvedValueOnce([
        { id: 1, closed:false, date: new Date(), endDate: new Date(), userId:1 },
        { id: 2, closed:false, date: new Date(), endDate: new Date(), userId:2 }
      ]);
  
      const rentals = await rentalsService.getRentals();
      expect(rentals).toHaveLength(2);
    });
  
    it("should return rentals by rentalId", async () => {
      //no exemplo é uma dulto alugando filme de adulto (sucesso)
      const mockRental: Rental & { movies: Movie[] }= { 
        id: 1, 
        closed: false, 
        date: new Date(), 
        endDate: new Date(), 
        userId:1, 
        movies: [
          {
            id: 1,
            name: "Panico IV",
            adultsOnly: true,
            rentalId: 1
          }
        ]
      }
  
      jest.spyOn(rentalsRepository, "getRentalById").mockResolvedValueOnce(mockRental);
  
      const rental = await rentalsService.getRentalById(1);
      expect(rental).toEqual(mockRental);
    });
  
    it("shoul return notFoundError when specifc retal is not found", async () => {
      jest.spyOn(rentalsRepository, "getRentalById").mockResolvedValueOnce(null); //obs que estamos mandando nullo para dar erro
  
      const promisse = rentalsService.getRentalById(1); //colocamos id 1 mas ele não foi criado, além disso não é necessário o uso do await já que não estamos realmente esperando uma resposta e é para dar erro.
  
      //dai como é esperado o erro já usa o rejects
      expect(promisse).rejects.toEqual(notFoundError("Rental not found."));
    });

  });

  describe("Create rentalks tests", () => {

    it("shoul throw an error when user does not exist", async () => {
      jest.spyOn(usersRepository, "getById").mockResolvedValueOnce(null);

      const promisse = rentalsService.createRental({
        userId: 1,
        moviesId: [ 1, 2, 3, 4]
      });

      expect(promisse).rejects.toEqual({
        name: "NotFoundError",
        message: "User not found."
      });
    });

    it("shoul throw an error when user alredy have a rental", async () => {
      const mockUser: User = { id: 1,  ...buildUserInput(true) };
      const mockUserRental: Rental = buildRentalReturn(1, true);
      
      jest.spyOn(usersRepository, "getById").mockResolvedValueOnce(mockUser);
      jest.spyOn(rentalsRepository, "getRentalsByUserId").mockResolvedValue([mockUserRental]);

      const promise = rentalsService.createRental({
        userId: mockUserRental.id,
        moviesId: [4, 5, 6, 7]
      });

      expect(promise).rejects.toEqual({
        name: "PendentRentalError",
        message: "The user already have a rental!"
      });
    });

    it("shoul throw an error when a minor user wants to rent a adult only movie", async () => {
      const mockUser: User = { id: 1,  ...buildUserInput(false) };
      const mockMovie: Movie = { 
        id: 1,
        rentalId: null,
        ...buildMovieInput(true)
      }

      jest.spyOn(usersRepository, "getById" ).mockResolvedValue(mockUser);
      jest.spyOn(rentalsRepository, "getRentalsByUserId").mockResolvedValue([]);
      jest.spyOn(moviesRepository, "getById").mockResolvedValue(mockMovie);

      const promise = rentalsService.createRental({
        userId: mockUser.id,
        moviesId: [1]
      })

      expect(promise).rejects.toEqual({
        name: "InsufficientAgeError",
        message: "Cannot see that movie."
      })
    });

    it("shoul throw an error when a movie does not exist", async () => {
      const mockUser: User = { id: 1,  ...buildUserInput(true) };
  
      jest.spyOn(usersRepository, "getById" ).mockResolvedValue(mockUser);
      jest.spyOn(rentalsRepository, "getRentalsByUserId").mockResolvedValue([]);
      jest.spyOn(moviesRepository, "getById").mockResolvedValue(null);
  
      const promise = rentalsService.createRental({
        userId: mockUser.id,
        moviesId: [1]
      });
  
      expect(promise).rejects.toEqual({
        name: "NotFoundError",
        message: "Movie not found."
      });
    });

    it("should throw an error when movie is not available", async () => {
      const mockUser: User = { id: 1,  ...buildUserInput(true) };
      const mockMovie: Movie = { 
        id: 1,
        rentalId: 1,
        ...buildMovieInput(true)
      }

      jest.spyOn(usersRepository, "getById" ).mockResolvedValue(mockUser);
      jest.spyOn(rentalsRepository, "getRentalsByUserId").mockResolvedValue([]);
      jest.spyOn(moviesRepository, "getById").mockResolvedValue(mockMovie);

      const promise = rentalsService.createRental({
        userId: 1,
        moviesId: [1]
      })

      expect(promise).rejects.toEqual({
        name: "MovieInRentalError",
        message: "Movie already in a rental."
      })
    })

    it("shoul do a rental for a movie", async () => {
      //(sucesso)
      const mockUser: User = { id: 1,  ...buildUserInput(true) };
      const mockMovie: Movie = { 
        id: 1,
        rentalId: null,
        ...buildMovieInput(true),
      }

      jest.spyOn(usersRepository, "getById" ).mockResolvedValue(mockUser);
      jest.spyOn(rentalsRepository, "getRentalsByUserId").mockResolvedValue([]);
      jest.spyOn(moviesRepository, "getById").mockResolvedValue(mockMovie);
      jest.spyOn(rentalsRepository, "createRental").mockResolvedValue(null);

      await rentalsService.createRental({
        userId: mockUser.id,
        moviesId: [1]
      });

    });

  });  

  describe("finish rentals test", () => {
    it("shoul trhow an error if rental does not exists", async () => {
      jest.spyOn(rentalsRepository, "getRentalById").mockResolvedValue(null);
      
      const promise = rentalsService.finishRental(1);

      expect(promise).rejects.toEqual({
        name: "NotFoundError",
        message: "Rental not found."
      });
    });

    it("shoud finish a rental", async () => {
      //sucesso
      const mockRental: Rental & { movies: Movie[] } = {
        ...buildRentalReturn(1, false),
        movies: [
          {
            id:1,
            rentalId: 1,
            ...buildMovieInput(true)
          }
        ]
      }
      jest.spyOn(rentalsRepository, "getRentalById").mockResolvedValue(mockRental);
      jest.spyOn(rentalsRepository, "finishRental").mockResolvedValue();

      await rentalsService.finishRental(1);
    });

  });


});