import random, sys

ID = int(sys.argv[1]) # Local test identificator (1,2,3,...)
K = int(sys.argv[2])  # Generate numbers in [-10^K; 10^K]  
random.seed(ID)

N = 10 ** K
A = random.randint(-N, N)
B = random.randint(-N, N)
print(A, B)