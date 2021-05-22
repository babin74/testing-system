import random, sys

ID = int(sys.argv[1]) # Local test identificator (1,2,3,...)
K = int(sys.argv[2])  # Generate numbers in [-10^K; 10^K]  

N = 10 ** K
A = N if ID == 1 or ID == 2 else -N
B = N if ID == 1 or ID == 3 else -N
print(A, B)